// JavaScript for Device Investment Simulator

async function loadHomeView() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Update point balance
        const pointBalanceEl = document.getElementById('point-balance');
        if (pointBalanceEl) {
            pointBalanceEl.textContent = data.user.point_balance;
        } else {
            console.error('Element with ID "point-balance" not found.');
        }

        // Update investment portfolio
        const portfolioListEl = document.getElementById('portfolio-list');
        if (portfolioListEl) {
            portfolioListEl.innerHTML = ''; // Clear loading message

            if (Object.keys(data.user.investments).length === 0) {
                portfolioListEl.innerHTML = '<p>No investments yet.</p>';
                return;
            }

            for (const deviceId in data.user.investments) {
                const investment = data.user.investments[deviceId];
                const device = data.devices.find(d => d.id === deviceId);

                if (device) {
                    const currentValue = investment.units * device.value;
                    const returnValue = currentValue - investment.amount;

                    const itemDiv = document.createElement('div');
                    itemDiv.classList.add('portfolio-item');
                    itemDiv.innerHTML = `
                        <h3>${device.name}</h3>
                        <p>Units Owned: ${investment.units.toFixed(2)}</p>
                        <p>Invested Amount: ${investment.amount.toFixed(2)} points</p>
                        <p>Current Value: ${currentValue.toFixed(2)} points</p>
                        <p>Return: <span class="${returnValue >= 0 ? 'positive-return' : 'negative-return'}">${returnValue.toFixed(2)} points</span></p>
                    `;
                    portfolioListEl.appendChild(itemDiv);
                } else {
                    console.warn(`Device with ID "${deviceId}" not found in device list.`);
                }
            }
        } else {
            console.error('Element with ID "portfolio-list" not found.');
        }

    } catch (error) {
        console.error('Could not load home view data:', error);
        const portfolioListEl = document.getElementById('portfolio-list');
        if (portfolioListEl) {
            portfolioListEl.innerHTML = '<p>Error loading portfolio data.</p>';
        }
        const pointBalanceEl = document.getElementById('point-balance');
        if (pointBalanceEl) {
            pointBalanceEl.textContent = 'Error';
        }
    }
}

async function loadDeviceListView() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const devicesContainerEl = document.getElementById('devices-container');
        if (devicesContainerEl) {
            devicesContainerEl.innerHTML = ''; // Clear loading message or old content

            if (!data.devices || data.devices.length === 0) {
                devicesContainerEl.innerHTML = '<p>No devices available for investment.</p>';
                return;
            }

            data.devices.forEach(device => {
                const deviceItemDiv = document.createElement('div');
                deviceItemDiv.classList.add('device-item');
                deviceItemDiv.innerHTML = `
                    <h3>${device.name}</h3>
                    <p>Current Value: ${device.value} points</p>
                    <p>Trend: <span class="trend-${device.trend}">${device.trend}</span></p>
                `;
                devicesContainerEl.appendChild(deviceItemDiv);
            });

        } else {
            console.error('Element with ID "devices-container" not found.');
        }

    } catch (error) {
        console.error('Could not load device list view data:', error);
        const devicesContainerEl = document.getElementById('devices-container');
        if (devicesContainerEl) {
            devicesContainerEl.innerHTML = '<p>Error loading device data.</p>';
        }
    }
}

let appData = {}; // To store data from data.json for in-memory updates

async function populateDeviceDropdown() {
    const selectEl = document.getElementById('investment-device-select');
    if (!selectEl) {
        console.error("investment-device-select element not found");
        return;
    }

    if (!appData.devices || appData.devices.length === 0) {
        selectEl.innerHTML = '<option value="">No devices available</option>';
        return;
    }

    selectEl.innerHTML = '<option value="">-- Select a Device --</option>'; // Placeholder
    appData.devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${device.name} (Value: ${device.value} points)`;
        selectEl.appendChild(option);
    });
}

async function loadInvestmentPage() {
    // Data is already fetched and stored in appData by loadHomeView or another initial loader
    // If not, we'd fetch it here. For now, we assume appData is populated.
    await populateDeviceDropdown(); // Populate dropdown using data from appData
}

function handleInvestment() {
    const deviceSelect = document.getElementById('investment-device-select');
    const amountInput = document.getElementById('investment-amount-input');
    const feedbackDiv = document.getElementById('investment-feedback');

    if (!deviceSelect || !amountInput || !feedbackDiv) {
        console.error("Required investment elements not found");
        feedbackDiv.textContent = "Error: Page elements missing.";
        feedbackDiv.className = 'negative-return';
        return;
    }

    const deviceId = deviceSelect.value;
    const amount = parseFloat(amountInput.value);

    feedbackDiv.textContent = ''; // Clear previous feedback

    if (!deviceId) {
        feedbackDiv.textContent = 'Please select a device.';
        feedbackDiv.className = 'negative-return';
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        feedbackDiv.textContent = 'Please enter a valid positive amount to invest.';
        feedbackDiv.className = 'negative-return';
        return;
    }

    if (amount > appData.user.point_balance) {
        feedbackDiv.textContent = 'Not enough points to make this investment.';
        feedbackDiv.className = 'negative-return';
        return;
    }

    const device = appData.devices.find(d => d.id === deviceId);
    if (!device) {
        feedbackDiv.textContent = 'Selected device not found. Please refresh.';
        feedbackDiv.className = 'negative-return';
        console.error("Consistency error: selected deviceId not in appData.devices");
        return;
    }

    // Process the investment
    appData.user.point_balance -= amount;
    const unitsBought = amount / device.value;

    if (appData.user.investments[deviceId]) {
        appData.user.investments[deviceId].amount += amount;
        appData.user.investments[deviceId].units += unitsBought;
    } else {
        appData.user.investments[deviceId] = {
            amount: amount,
            units: unitsBought
        };
    }

    feedbackDiv.textContent = `Successfully invested ${amount.toFixed(2)} points in ${device.name}. You bought ${unitsBought.toFixed(2)} units.`;
    feedbackDiv.className = 'positive-return';
    amountInput.value = ''; // Clear input
    deviceSelect.value = ''; // Reset dropdown

    // Reload other views to reflect changes
    // We pass appData to avoid re-fetching, and instead use the updated in-memory data
    loadHomeView(); // This will now use the global appData
    loadDeviceListView(); // This will also use global appData (needs slight modification to accept data or use global)
}


// Modify loadHomeView and loadDeviceListView to use global appData if available,
// or fetch if appData is empty (e.g., on first load)

async function initialDataLoad() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        appData = await response.json();
        return true;
    } catch (error) {
        console.error('Could not load initial app data:', error);
        return false;
    }
}

// Redefine loadHomeView slightly to use appData
async function loadHomeView() { // Removed data parameter
    const pointBalanceEl = document.getElementById('point-balance');
    const portfolioListEl = document.getElementById('portfolio-list');

    if (!pointBalanceEl || !portfolioListEl) {
        console.error('Home view elements not found.');
        return;
    }
    
    if (!appData.user || appData.devices === undefined) {
        portfolioListEl.innerHTML = '<p>Data not loaded yet. Try refreshing.</p>';
        pointBalanceEl.textContent = 'N/A';
        return;
    }

    pointBalanceEl.textContent = appData.user.point_balance.toFixed(2);
    portfolioListEl.innerHTML = ''; 

    if (Object.keys(appData.user.investments).length === 0) {
        portfolioListEl.innerHTML = '<p>No investments yet.</p>';
        return;
    }

    for (const deviceId in appData.user.investments) {
        const investment = appData.user.investments[deviceId];
        const device = appData.devices.find(d => d.id === deviceId);

        if (device) {
            const currentValue = investment.units * device.value;
            const returnValue = currentValue - investment.amount;
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('portfolio-item');
            itemDiv.innerHTML = `
                <h3>${device.name}</h3>
                <p>Units Owned: ${investment.units.toFixed(2)}</p>
                <p>Invested Amount: ${investment.amount.toFixed(2)} points</p>
                <p>Current Value: ${currentValue.toFixed(2)} points</p>
                <p>Return: <span class="${returnValue >= 0 ? 'positive-return' : 'negative-return'}">${returnValue.toFixed(2)} points</span></p>
            `;
            portfolioListEl.appendChild(itemDiv);
        } else {
            console.warn(`Device with ID "${deviceId}" not found in device list during Home View update.`);
        }
    }
}

// Redefine loadDeviceListView slightly to use appData
async function loadDeviceListView() { // Removed data parameter
    const devicesContainerEl = document.getElementById('devices-container');
    if (!devicesContainerEl) {
        console.error('Element with ID "devices-container" not found.');
        return;
    }

    if (!appData.devices || appData.devices.length === 0) {
        devicesContainerEl.innerHTML = '<p>No devices available for investment.</p>';
        return;
    }
    
    devicesContainerEl.innerHTML = ''; 

    appData.devices.forEach(device => {
        const deviceItemDiv = document.createElement('div');
        deviceItemDiv.classList.add('device-item');
        deviceItemDiv.innerHTML = `
            <h3>${device.name}</h3>
            <p>Current Value: ${device.value} points</p>
            <p>Trend: <span class="trend-${device.trend}">${device.trend}</span></p>
        `;
        devicesContainerEl.appendChild(deviceItemDiv);
    });
}


// Initial setup when the page loads
window.onload = async () => {
    const dataLoaded = await initialDataLoad();
    if (dataLoaded) {
        loadHomeView();
        loadDeviceListView();
        loadInvestmentPage(); // Load investment page elements (like dropdown)

        const investButton = document.getElementById('invest-button');
        if (investButton) {
            investButton.addEventListener('click', handleInvestment);
        } else {
            console.error("Invest button not found to attach listener.");
        }
    } else {
        // Handle data loading failure - show error messages in UI
        document.body.innerHTML = '<h1>Error loading application data. Please try refreshing the page.</h1>';
    }
};

// --- Basic Test Framework ---
let testResults = [];

function assertEqual(actual, expected, testName) {
    const result = { name: testName, passed: false, message: '' };
    if (actual === expected) {
        result.passed = true;
        result.message = `PASS: ${testName}`;
        console.log(`%cPASS: ${testName}`, 'color: green;');
    } else {
        result.message = `FAIL: ${testName}. Expected "${expected}", but got "${actual}".`;
        console.error(`FAIL: ${testName}. Expected "${expected}", but got "${actual}".`);
    }
    testResults.push(result);
    updateTestResultsView();
}

function assertInRange(actual, min, max, testName) {
    const result = { name: testName, passed: false, message: '' };
    if (actual >= min && actual <= max) {
        result.passed = true;
        result.message = `PASS: ${testName}. Value ${actual} is within [${min}, ${max}].`;
        console.log(`%cPASS: ${testName}. Value ${actual} is within [${min}, ${max}].`, 'color: green;');
    } else {
        result.message = `FAIL: ${testName}. Expected value ${actual} to be within [${min}, ${max}].`;
        console.error(`FAIL: ${testName}. Expected value ${actual} to be within [${min}, ${max}].`);
    }
    testResults.push(result);
    updateTestResultsView();
}

function updateTestResultsView() {
    const resultsContainer = document.getElementById('test-results-container');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = ''; // Clear previous results
    let passes = 0;
    let fails = 0;

    testResults.forEach(result => {
        const resultEl = document.createElement('p');
        resultEl.textContent = result.message;
        resultEl.className = result.passed ? 'test-pass' : 'test-fail';
        resultsContainer.appendChild(resultEl);
        if (result.passed) passes++;
        else fails++;
    });

    const summaryEl = document.createElement('p');
    summaryEl.innerHTML = `<strong>Summary: ${passes} passed, ${fails} failed.</strong>`;
    resultsContainer.prepend(summaryEl);
}


function runTests() {
    console.log("--- Running All Tests ---");
    testResults = []; // Reset results for this run

    // --- Tests for simulate_value_change ---
    console.log("--- Testing simulate_value_change ---");
    const initialValue = 100;

    // Test "up" trend
    let upValue = simulate_value_change(initialValue, "up");
    assertInRange(upValue, initialValue * 1.01, initialValue * 1.10, "simulate_value_change: 'up' trend produces value in expected range (1.01x to 1.10x)");
    assertEqual(upValue > initialValue, true, "simulate_value_change: 'up' trend increases value");

    // Test "down" trend
    let downValue = simulate_value_change(initialValue, "down");
    assertInRange(downValue, initialValue * 0.90, initialValue * 0.99, "simulate_value_change: 'down' trend produces value in expected range (0.90x to 0.99x)");
    assertEqual(downValue < initialValue, true, "simulate_value_change: 'down' trend decreases value");
    
    // Test "stable" trend
    let stableValue = simulate_value_change(initialValue, "stable");
    assertInRange(stableValue, initialValue * 0.98, initialValue * 1.02, "simulate_value_change: 'stable' trend produces value in expected range (0.98x to 1.02x)");

    // Test with invalid trend (should default to stable)
    let invalidTrendValue = simulate_value_change(initialValue, "nonexistent_trend");
    assertInRange(invalidTrendValue, initialValue * 0.98, initialValue * 1.02, "simulate_value_change: invalid trend defaults to 'stable' range");

    // Test with value 0
    let zeroValue = simulate_value_change(0, "up");
    assertEqual(zeroValue, 0, "simulate_value_change: value 0 with 'up' trend remains 0");
    zeroValue = simulate_value_change(0, "down");
    assertEqual(zeroValue, 0, "simulate_value_change: value 0 with 'down' trend remains 0");
    zeroValue = simulate_value_change(0, "stable");
    assertEqual(zeroValue, 0, "simulate_value_change: value 0 with 'stable' trend remains 0");


    // --- Tests for handleInvestment ---
    console.log("--- Testing handleInvestment ---");

    // Mock HTML elements required by handleInvestment
    const mockDeviceSelect = document.createElement('select');
    mockDeviceSelect.id = 'investment-device-select';
    const mockAmountInput = document.createElement('input');
    mockAmountInput.id = 'investment-amount-input';
    const mockFeedbackDiv = document.createElement('div');
    mockFeedbackDiv.id = 'investment-feedback';
    
    // Temporarily append to body if elements need to be in DOM (usually not for logic tests)
    // document.body.appendChild(mockDeviceSelect);
    // document.body.appendChild(mockAmountInput);
    // document.body.appendChild(mockFeedbackDiv);

    // Store original appData and elements
    const originalAppData = JSON.parse(JSON.stringify(appData)); // Deep copy
    const originalDeviceSelect = document.getElementById('investment-device-select');
    const originalAmountInput = document.getElementById('investment-amount-input');
    const originalFeedbackDiv = document.getElementById('investment-feedback');

    // Replace actual elements with mocks for testing this function
    document.getElementById('investment-device-select').replaceWith(mockDeviceSelect);
    document.getElementById('investment-amount-input').replaceWith(mockAmountInput);
    document.getElementById('investment-feedback').replaceWith(mockFeedbackDiv);
    
    // Helper to reset appData and mock elements for each investment test
    function setupInvestmentTest() {
        appData = JSON.parse(JSON.stringify(originalAppData)); // Reset appData to initial state for each test
        // Ensure devices are in appData for tests
        if (!appData.devices || appData.devices.length === 0) {
            appData.devices = [
                { id: "tv", name: "Test TV", value: 100, trend: "stable" },
                { id: "fridge", name: "Test Fridge", value: 200, trend: "stable" }
            ];
        }
        appData.user.point_balance = 1000;
        appData.user.investments = {};

        mockDeviceSelect.innerHTML = ''; // Clear options
        appData.devices.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            mockDeviceSelect.appendChild(opt);
        });
        mockAmountInput.value = '';
        mockFeedbackDiv.textContent = '';
    }

    // Test 1: Successful investment in a new device
    setupInvestmentTest();
    mockDeviceSelect.value = 'tv';
    mockAmountInput.value = '100'; // Invest 100 points in TV (value 100) -> 1 unit
    handleInvestment();
    assertEqual(appData.user.point_balance, 900, "handleInvestment: Successful new investment updates point balance");
    assertEqual(appData.user.investments['tv'] !== undefined, true, "handleInvestment: Investment creates entry for new device");
    assertEqual(appData.user.investments['tv'] ? appData.user.investments['tv'].amount.toFixed(0) : 'undefined', '100', "handleInvestment: Correct amount for new device");
    assertEqual(appData.user.investments['tv'] ? appData.user.investments['tv'].units.toFixed(0) : 'undefined', '1', "handleInvestment: Correct units for new device");

    // Test 2: Successful investment in an existing device
    setupInvestmentTest();
    appData.user.investments['tv'] = { amount: 50, units: 0.5 }; // Pre-existing investment
    appData.user.point_balance = 950; // Reflect pre-existing investment
    mockDeviceSelect.value = 'tv';
    mockAmountInput.value = '100'; // Invest another 100 points (1 unit)
    handleInvestment();
    assertEqual(appData.user.point_balance, 850, "handleInvestment: Successful existing investment updates point balance");
    assertEqual(appData.user.investments['tv'].amount.toFixed(0), '150', "handleInvestment: Correctly updates amount for existing device");
    assertEqual(appData.user.investments['tv'].units.toFixed(1), '1.5', "handleInvestment: Correctly updates units for existing device");

    // Test 3: Investment with insufficient points
    setupInvestmentTest();
    appData.user.point_balance = 50;
    mockDeviceSelect.value = 'tv';
    mockAmountInput.value = '100';
    handleInvestment();
    assertEqual(appData.user.point_balance, 50, "handleInvestment: Insufficient points - point balance unchanged");
    assertEqual(appData.user.investments['tv'] === undefined, true, "handleInvestment: Insufficient points - no investment made");
    assertEqual(mockFeedbackDiv.textContent.includes('Not enough points'), true, "handleInvestment: Insufficient points - feedback message shown");

    // Test 4: Investment with zero amount
    setupInvestmentTest();
    mockDeviceSelect.value = 'tv';
    mockAmountInput.value = '0';
    handleInvestment();
    assertEqual(appData.user.point_balance, 1000, "handleInvestment: Zero amount - point balance unchanged");
    assertEqual(appData.user.investments['tv'] === undefined, true, "handleInvestment: Zero amount - no investment made");
    assertEqual(mockFeedbackDiv.textContent.includes('valid positive amount'), true, "handleInvestment: Zero amount - feedback message shown");

    // Test 5: Investment with negative amount
    setupInvestmentTest();
    mockDeviceSelect.value = 'tv';
    mockAmountInput.value = '-50';
    handleInvestment();
    assertEqual(appData.user.point_balance, 1000, "handleInvestment: Negative amount - point balance unchanged");
    assertEqual(appData.user.investments['tv'] === undefined, true, "handleInvestment: Negative amount - no investment made");
    assertEqual(mockFeedbackDiv.textContent.includes('valid positive amount'), true, "handleInvestment: Negative amount - feedback message shown");

    // Test 6: Investment with no device selected
    setupInvestmentTest();
    mockDeviceSelect.value = ''; // No device selected
    mockAmountInput.value = '100';
    handleInvestment();
    assertEqual(appData.user.point_balance, 1000, "handleInvestment: No device selected - point balance unchanged");
    assertEqual(Object.keys(appData.user.investments).length, 0, "handleInvestment: No device selected - no investment made");
    assertEqual(mockFeedbackDiv.textContent.includes('select a device'), true, "handleInvestment: No device selected - feedback message shown");


    // Restore original elements and appData
    mockDeviceSelect.replaceWith(originalDeviceSelect);
    mockAmountInput.replaceWith(originalAmountInput);
    mockFeedbackDiv.replaceWith(originalFeedbackDiv);
    appData = JSON.parse(JSON.stringify(originalAppData)); // Restore appData
    // After tests, reload views to ensure UI consistency if appData was changed by tests
    // This is important if tests are run multiple times without page refresh
    loadHomeView();
    loadDeviceListView();
    populateDeviceDropdown();


    console.log("--- All Tests Complete ---");
    updateTestResultsView(); // Final update after all tests
}


// Modify window.onload to attach event listener for the simulate and test buttons
window.onload = async () => {
    const dataLoaded = await initialDataLoad();
    if (dataLoaded) {
        loadHomeView();
        loadDeviceListView();
        loadInvestmentPage();

        const investButton = document.getElementById('invest-button');
        if (investButton) {
            investButton.addEventListener('click', handleInvestment);
        } else {
            console.error("Invest button not found to attach listener.");
        }

        const simulateDayButton = document.getElementById('simulate-day-button');
        if (simulateDayButton) {
            simulateDayButton.addEventListener('click', runDailySimulation);
        } else {
            console.error("Simulate day button not found to attach listener.");
        }
        
        const runTestsButton = document.getElementById('run-tests-button');
        if (runTestsButton) {
            runTestsButton.addEventListener('click', runTests);
        } else {
            console.error("Run tests button not found to attach listener.");
        }

        updateDailyResultsView(); // Initial call to set default state

    } else {
        document.body.innerHTML = '<h1>Error loading application data. Please try refreshing the page.</h1>';
    }
};

// --- Simulation and Daily Results ---

function simulate_value_change(value, trend) {
    let delta;
    switch (trend) {
        case "up":
            delta = Math.random() * (1.10 - 1.01) + 1.01; // random between 1.01 and 1.10
            break;
        case "down":
            delta = Math.random() * (0.99 - 0.90) + 0.90; // random between 0.90 and 0.99
            break;
        case "stable":
        default:
            delta = Math.random() * (1.02 - 0.98) + 0.98; // random between 0.98 and 1.02
            break;
    }
    return parseFloat((value * delta).toFixed(2));
}

let dailySimulationResults = {
    changes: [],
    totalGainLoss: 0
};

function calculateTotalPortfolioValue(investments, devices) {
    let totalValue = 0;
    for (const deviceId in investments) {
        const investment = investments[deviceId];
        const device = devices.find(d => d.id === deviceId);
        if (device) {
            totalValue += investment.units * device.value;
        }
    }
    return totalValue;
}

async function runDailySimulation() {
    if (!appData || !appData.devices || !appData.user) {
        console.error("App data not loaded, cannot run simulation.");
        // Optionally display an error to the user in the daily-results-view
        const dailyChangesContainer = document.getElementById('daily-changes-container');
        if (dailyChangesContainer) {
            dailyChangesContainer.innerHTML = '<p>Error: Data not loaded. Cannot simulate.</p>';
        }
        return;
    }

    const oldPortfolioValue = calculateTotalPortfolioValue(appData.user.investments, appData.devices);
    dailySimulationResults.changes = []; // Reset changes for the new day

    // Store old values and update device values
    const deviceValueChanges = {}; 

    appData.devices.forEach(device => {
        const oldValue = device.value;
        deviceValueChanges[device.id] = { old: oldValue, new: 0 }; // Store old value

        device.value = simulate_value_change(device.value, device.trend);
        deviceValueChanges[device.id].new = device.value; // Store new value

        // Optional: Randomly change trend
        const trendChangeChance = 0.1; // 10% chance to change trend
        if (Math.random() < trendChangeChance) {
            const trends = ["up", "down", "stable"];
            const currentTrendIndex = trends.indexOf(device.trend);
            trends.splice(currentTrendIndex, 1); // Remove current trend
            device.trend = trends[Math.floor(Math.random() * trends.length)];
        }
    });

    // Recalculate user's investments and overall portfolio value
    for (const deviceId in appData.user.investments) {
        const investment = appData.user.investments[deviceId];
        const device = appData.devices.find(d => d.id === deviceId); // Device now has updated value
        
        if (device && deviceValueChanges[deviceId]) {
            const oldDeviceValue = deviceValueChanges[deviceId].old;
            const newDeviceValue = deviceValueChanges[deviceId].new;
            
            const oldInvestmentValue = investment.units * oldDeviceValue;
            const newInvestmentValue = investment.units * newDeviceValue;
            const investmentChange = newInvestmentValue - oldInvestmentValue;

            dailySimulationResults.changes.push({
                name: device.name,
                oldValue: oldDeviceValue,
                newValue: newDeviceValue,
                investmentChange: investmentChange
            });
        }
    }
    
    const newPortfolioValue = calculateTotalPortfolioValue(appData.user.investments, appData.devices);
    dailySimulationResults.totalGainLoss = newPortfolioValue - oldPortfolioValue;

    updateDailyResultsView();
    loadHomeView(); // Refresh home view with new portfolio values
    loadDeviceListView(); // Refresh device list with new values and trends
}

function updateDailyResultsView() {
    const changesContainer = document.getElementById('daily-changes-container');
    const totalGainLossEl = document.getElementById('daily-total-gain-loss');

    if (!changesContainer || !totalGainLossEl) {
        console.error("Daily results view elements not found.");
        return;
    }

    changesContainer.innerHTML = ''; // Clear previous results

    if (dailySimulationResults.changes.length === 0) {
        changesContainer.innerHTML = '<p>No investments to track for daily changes, or simulation not yet run.</p>';
    } else {
        dailySimulationResults.changes.forEach(change => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('daily-change-item');
            itemDiv.innerHTML = `
                <strong>${change.name}:</strong> Value changed from ${change.oldValue.toFixed(2)} to ${change.newValue.toFixed(2)}. 
                Your investment changed by <span class="${change.investmentChange >= 0 ? 'positive-return' : 'negative-return'}">${change.investmentChange.toFixed(2)} points</span>.
            `;
            changesContainer.appendChild(itemDiv);
        });
    }

    totalGainLossEl.textContent = `${dailySimulationResults.totalGainLoss.toFixed(2)} points`;
    totalGainLossEl.className = dailySimulationResults.totalGainLoss >= 0 ? 'positive-return' : 'negative-return';
}


// Modify window.onload to attach event listener for the simulate button
window.onload = async () => {
    const dataLoaded = await initialDataLoad();
    if (dataLoaded) {
        loadHomeView();
        loadDeviceListView();
        loadInvestmentPage();

        const investButton = document.getElementById('invest-button');
        if (investButton) {
            investButton.addEventListener('click', handleInvestment);
        } else {
            console.error("Invest button not found to attach listener.");
        }

        const simulateDayButton = document.getElementById('simulate-day-button');
        if (simulateDayButton) {
            simulateDayButton.addEventListener('click', runDailySimulation);
        } else {
            console.error("Simulate day button not found to attach listener.");
        }
        
        updateDailyResultsView(); // Initial call to set default state

    } else {
        document.body.innerHTML = '<h1>Error loading application data. Please try refreshing the page.</h1>';
    }
};
