// JavaScript for Device Investment Simulator
let currentTranslations = {};

/**
 * Fetches a translated string by key and formats it with provided parameters.
 * @param {string} key - The key of the translation string.
 * @param {object} [params={}] - An object containing placeholder values.
 * @returns {string} The formatted translated string, or the key if not found.
 */
function getString(key, params = {}) {
    let str = currentTranslations[key] || key; // Fallback to key if not found
    if (currentTranslations[key] === undefined) {
        console.warn(`Missing translation for key: ${key} (getString)`);
    }
    for (const p in params) {
        str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
    }
    return str;
}

async function loadTranslations(languageCode) {
    const path = `locales/${languageCode}.json`;
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load translation file: ${path}. Status: ${response.status}`);
        }
        currentTranslations = await response.json();
        console.log(`Translations loaded for ${languageCode}:`, currentTranslations);
        return true; // Indicate success
    } catch (error) {
        console.error(`Error loading translations for ${languageCode}:`, error);
        if (languageCode !== 'en') { // Avoid infinite loop if English fails
            console.warn('Falling back to English translations.');
            return loadTranslations('en'); // Attempt to load English as a fallback
        }
        currentTranslations = {}; // Reset or ensure it's empty on critical failure
        return false; // Indicate failure
    }
}

function applyTranslations() {
    if (Object.keys(currentTranslations).length === 0) {
        console.error("No translations loaded. Cannot apply translations.");
        return;
    }

    // Translate Page Title
    if (currentTranslations.pageTitle) {
        document.title = currentTranslations.pageTitle;
    }

    // Translate Elements with data-translate-key
    document.querySelectorAll('[data-translate-key]').forEach(element => {
        const key = element.dataset.translateKey;
        if (currentTranslations[key]) {
            // Handle elements that might contain child elements (like the point balance suffix)
            // We only want to set textContent if the element is a direct text node container
            // or if it's specifically a span meant for a suffix.
            if (element.classList.contains('translate-suffix')) {
                 element.textContent = currentTranslations[key];
            } else if (element.children.length === 0 || (element.children.length === 1 && element.children[0].nodeName === '#text')) {
                 // If no children or only text node children, safe to set textContent
                 element.textContent = currentTranslations[key];
            } else {
                // If the element has other element children, find the first text node and update it
                // This is a basic approach. More complex structures might need specific handling.
                let foundTextNode = false;
                for (const node of element.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                        node.textContent = currentTranslations[key];
                        foundTextNode = true;
                        break;
                    }
                }
                if (!foundTextNode && currentTranslations[key]) {
                     // Fallback for elements like <p> that might have a key but its text is set by JS later
                     // This ensures static <p data-translate-key="someKey">Initial Text</p> is translated
                     // if not handled by a specific JS function.
                     if(element.tagName === 'P' || element.tagName === 'SPAN' || element.tagName === 'OPTION') {
                        element.textContent = currentTranslations[key];
                     } else {
                        console.warn(`Element with key '${key}' has child elements and no direct text node to translate. Content not changed for:`, element);
                     }
                }
            }

        } else {
            console.warn(`Missing translation for key: ${key}`);
        }
    });

    // Translate Attributes (e.g., placeholder)
    document.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
        const key = element.dataset.translatePlaceholderKey;
        if (currentTranslations[key]) {
            element.placeholder = currentTranslations[key];
        } else {
            console.warn(`Missing translation for placeholder key: ${key}`);
        }
    });
}

const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' }
];

function populateLanguageSelector() {
    const languageSelectEl = document.getElementById('language-select');
    if (!languageSelectEl) {
        console.error("language-select element not found.");
        return;
    }

    availableLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        languageSelectEl.appendChild(option);
    });
}

// Helper function to refresh all views that might contain translated dynamic content
function refreshAllTranslatedViews() {
    console.log("Refreshing all views for new language...");
    loadHomeView(); 
    loadDeviceListView();
    populateDeviceDropdown(); // This is important for the investment device list
    updateDailyResultsView();
    updateTestResultsView(); // This will re-render test results using new translations
    // Note: populateDeviceDropdown is called by loadInvestmentPage, but calling it directly ensures
    // it's refreshed even if loadInvestmentPage had other logic preventing immediate re-population.
    // If any other UI components are added that display dynamic translatable text, they should be refreshed here.
}


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
        console.error("investment-device-select element not found"); // Dev message
        return;
    }

    if (!appData.devices || appData.devices.length === 0) {
        selectEl.innerHTML = `<option value="">${getString('invest_loadingDevicesOption')}</option>`; 
        // Or a more specific key if "No devices available" is different from "Loading devices..." contextually
        // For now, using invest_loadingDevicesOption as a generic placeholder if empty.
        // The key 'invest_noneAvailableInDropdown' could be created if needed for "No devices available" specifically for the dropdown.
        // Let's assume the static HTML option "Loading devices..." is translated by applyTranslations
        // and if populateDeviceDropdown is called when there are no devices, we use a specific message.
        // Re-checking keys: 'invest_loadingDevicesOption' is for the initial static <option>.
        // 'devices_noneAvailable' is for the device list view.
        // A new key might be 'invest_noDevicesForDropdown'. For now, let's use devices_noneAvailable if appropriate.
        selectEl.innerHTML = `<option value="">${getString('devices_noneAvailable')}</option>`; // More fitting
        return;
    }

    // The initial <option value="" data-translate-key="invest_loadingDevicesOption">Loading devices...</option>
    // from HTML is handled by applyTranslations.
    // populateDeviceDropdown clears and rebuilds the list.
    selectEl.innerHTML = ''; // Clear existing options first, including the "Loading..." one

    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = getString('invest_selectDeviceOption');
    selectEl.appendChild(placeholderOption);
    
    appData.devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = getString('invest_deviceOptionText', { deviceName: device.name, deviceValue: device.value });
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
        console.error("Required investment elements not found"); // Dev message
        if (feedbackDiv) { // Check if feedbackDiv itself exists
            feedbackDiv.textContent = getString('invest_feedbackErrorMissingElements');
            feedbackDiv.className = 'negative-return';
        }
        return;
    }

    const deviceId = deviceSelect.value;
    const amount = parseFloat(amountInput.value);

    feedbackDiv.textContent = ''; // Clear previous feedback

    if (!deviceId) {
        feedbackDiv.textContent = getString('invest_feedbackSelectDevice');
        feedbackDiv.className = 'negative-return';
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        feedbackDiv.textContent = getString('invest_feedbackInvalidAmount');
        feedbackDiv.className = 'negative-return';
        return;
    }

    if (amount > appData.user.point_balance) {
        feedbackDiv.textContent = getString('invest_feedbackInsufficientPoints');
        feedbackDiv.className = 'negative-return';
        return;
    }

    const device = appData.devices.find(d => d.id === deviceId);
    if (!device) {
        feedbackDiv.textContent = getString('invest_feedbackDeviceNotFound');
        feedbackDiv.className = 'negative-return';
        console.error("Consistency error: selected deviceId not in appData.devices"); // Dev message
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

    feedbackDiv.textContent = getString('invest_successMessage', {
        amount: amount.toFixed(2),
        deviceName: device.name,
        units: unitsBought.toFixed(2)
    });
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
        console.error('Could not load initial app data:', error); // Dev message
        // User-facing message for this failure is handled in window.onload
        // by trying to use getString('common_errorLoadingApp')
        return false;
    }
}

// Redefine loadHomeView slightly to use appData
async function loadHomeView() { // Removed data parameter
    const pointBalanceEl = document.getElementById('point-balance');
    const portfolioListEl = document.getElementById('portfolio-list');

    if (!pointBalanceEl || !portfolioListEl) {
        console.error('Home view elements not found.'); // Keep as is, dev message
        return;
    }
    
    if (!appData.user || appData.devices === undefined) {
        // Attempt to use getString for user-facing messages if translations are loaded
        portfolioListEl.innerHTML = `<p>${getString('home_errorLoadingPortfolio')}</p>`; // Or a more generic "data not available" key
        pointBalanceEl.textContent = getString('home_errorPoints');
        return;
    }

    // For pointBalanceEl, the main text is numeric, the key "home_loadingPoints" is for initial state.
    // The suffix "home_pointsSuffix" is handled by applyTranslations for its static part.
    // If pointBalanceEl itself needs a translated "Loading..." or "Error", it should be set by applyTranslations
    // or a specific function if its content is dynamic beyond just the number.
    // Here, we assume the number is the primary content, and static parts are translated.
    pointBalanceEl.textContent = appData.user.point_balance.toFixed(2); 
    // The " points" suffix is static in HTML and handled by applyTranslations.
    // If "Loading..." or "Error" states for point balance are set dynamically, use getString:
    // e.g. if (loading) pointBalanceEl.textContent = getString('home_loadingPoints');
    // For now, assuming "home_loadingPoints" key is used for the initial HTML state.

    portfolioListEl.innerHTML = ''; 

    if (Object.keys(appData.user.investments).length === 0) {
        portfolioListEl.innerHTML = `<p>${getString('home_noInvestments')}</p>`;
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
            // Using getString for dynamic parts of the portfolio item
            itemDiv.innerHTML = `
                <h3>${device.name}</h3> 
                <p>${getString('home_unitsOwned', { units: investment.units.toFixed(2) })}</p>
                <p>${getString('home_investedAmount', { amount: investment.amount.toFixed(2) })}</p>
                <p>${getString('home_currentValue', { value: currentValue.toFixed(2) })}</p>
                <p>${getString('home_return', { returnValue: returnValue.toFixed(2) })}</p>
            `;
            // The " points" suffix in "Return: ..." is part of the home_return translation string.
            // Ensure the positive/negative class is still applied correctly to the span if needed.
            // The current getString approach replaces the whole string.
            // For complex HTML within a translation, more advanced handling or splitting keys might be needed.
            // For now, assuming the return string includes the necessary span or styling is handled by CSS.
            // Let's refine the return part to keep the class logic:
            const returnP = itemDiv.querySelector('p:last-child'); // Get the last p element (Return)
            if(returnP) {
                 // Clear content set by getString and rebuild with class
                 returnP.innerHTML = `${getString('home_return').split(':')[0]}: <span class="${returnValue >= 0 ? 'positive-return' : 'negative-return'}">${returnValue.toFixed(2)} ${getString('home_pointsSuffix').trim()}</span>`;
            }
            // A better way for "Return: {returnValue} points" might be to have "home_returnLabel": "Return:"
            // And then construct it: <p>${getString('home_returnLabel')} <span class="...">${returnValue.toFixed(2)} ${getString('home_pointsSuffix')}</span></p>
            // For now, the above adjustment to re-parse the string is a workaround.
            // Let's simplify by assuming "home_return" is "Return: {returnValue} points"
            // and the class is applied to the whole <p> or handled by CSS if possible.
            // If specific styling on the number is crucial:
            // itemDiv.innerHTML would be:
            // ...
            // <p> ${getString('home_return_label')} <span class="${returnValue >= 0 ? 'positive-return' : 'negative-return'}">${getString('home_return_value', {returnValue: returnValue.toFixed(2)})}</span></p>
            // This implies new keys: 'home_return_label' and 'home_return_value'.
            // Given the current keys, the previous itemDiv.innerHTML is the direct interpretation.
            // The fix for the span class:
            const returnParagraph = Array.from(itemDiv.getElementsByTagName('p')).find(p => p.textContent.startsWith(getString('home_return').split('{')[0]));
            if (returnParagraph) {
                const keyForReturnLabel = 'home_return_label_for_dynamic'; // A dummy key for "Return: "
                                currentTranslations[keyForReturnLabel] = (currentTranslations['home_return'] || "Return: {returnValue} points").split('{')[0];

                returnParagraph.innerHTML = `${getString(keyForReturnLabel)}<span class="${returnValue >= 0 ? 'positive-return' : 'negative-return'}">${returnValue.toFixed(2)} ${getString('home_pointsSuffix').trim()}</span>`;
            }


            portfolioListEl.appendChild(itemDiv);
        } else {
            console.warn(`Device with ID "${deviceId}" not found in device list during Home View update.`); // Dev message
        }
    }
}

// Redefine loadDeviceListView slightly to use appData
async function loadDeviceListView() { // Removed data parameter
    const devicesContainerEl = document.getElementById('devices-container');
    if (!devicesContainerEl) {
        console.error('Element with ID "devices-container" not found.'); // Dev message
        return;
    }

    if (!appData.devices) { // Handles case where appData.devices might be undefined
        devicesContainerEl.innerHTML = `<p>${getString('devices_errorLoading')}</p>`;
        return;
    }
    
    if (appData.devices.length === 0) {
        devicesContainerEl.innerHTML = `<p>${getString('devices_noneAvailable')}</p>`;
        return;
    }
    
    devicesContainerEl.innerHTML = ''; 

    appData.devices.forEach(device => {
        const deviceItemDiv = document.createElement('div');
        deviceItemDiv.classList.add('device-item');
        // Using getString for dynamic parts of the device item
        deviceItemDiv.innerHTML = `
            <h3>${device.name}</h3>
            <p>${getString('devices_currentValue', { value: device.value })}</p>
            <p>${getString('devices_trend', { trend: device.trend })}</p> 
        `;
        // Note: The trend value itself might need translation if "up", "down", "stable" are to be localized.
        // This would require keys like "trend_up", "trend_down", "trend_stable".
        // For now, assuming trend values are directly displayable or handled by CSS classes for styling.
        // If trend text needs translation:
        // <p>${getString('devices_trend_label')} <span class="trend-${device.trend}">${getString('trend_' + device.trend)}</span></p>
        // This implies new keys: 'devices_trend_label' and 'trend_up', 'trend_down', 'trend_stable'.
        // The current getString setup handles the provided keys.
        // To ensure the class for trend styling is preserved:
        const trendParagraph = Array.from(deviceItemDiv.getElementsByTagName('p')).find(p => p.textContent.startsWith(getString('devices_trend').split('{')[0]));
        if (trendParagraph) {
             const keyForTrendLabel = 'devices_trend_label_for_dynamic'; // dummy key
             currentTranslations[keyForTrendLabel] = (currentTranslations['devices_trend'] || "Trend: {trend}").split('{')[0];
             // Assuming trend values (up, stable, down) are either CSS styled or don't need translation themselves
             trendParagraph.innerHTML = `${getString(keyForTrendLabel)}<span class="trend-${device.trend}">${device.trend}</span>`;
        }

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
        // Using getString for the message, testName is a variable, not a key.
        result.message = getString('test_passMessage', { testName: testName });
        console.log(`%c${result.message}`, 'color: green;');
    } else {
        // Using getString for the message.
        result.message = getString('test_failMessageExpected', { 
            testName: testName, 
            expected: expected, 
            actual: actual 
        });
        console.error(result.message);
    }
    testResults.push(result);
    // updateTestResultsView(); // Called by runTests after all assertions in a group
}

function assertInRange(actual, min, max, testName) {
    const result = { name: testName, passed: false, message: '' };
    if (actual >= min && actual <= max) {
        result.passed = true;
        // The key 'test_passMessageRange' could be created if a different format is needed.
        // For now, let's assume 'test_passMessage' is generic enough, or create a new one.
        // Let's assume 'test_passMessage' is "PASS: {testName}" and we add context here.
        // Or, better, create a specific key if structure differs.
        // Given existing keys: 'test_passMessage' -> "PASS: {testName}"
        // We'll use a more generic approach by not creating a specific "passRange" message yet,
        // but it would be: result.message = getString('test_passMessageRange', { testName: testName, actual: actual, min: min, max: max });
        result.message = `${getString('test_passMessage', { testName: testName })} (Value ${actual} is within [${min}, ${max}])`;
        console.log(`%c${result.message}`, 'color: green;');
    } else {
        result.message = getString('test_failMessageRange', { 
            testName: testName, 
            actual: actual, 
            min: min, 
            max: max 
        });
        console.error(result.message);
    }
    testResults.push(result);
    // updateTestResultsView(); // Called by runTests
}

function updateTestResultsView() {
    const resultsContainer = document.getElementById('test-results-container');
    if (!resultsContainer) return;

    // The initial message "Click Run Tests..." is static HTML with data-translate-key="test_initialMessage"
    // and should be handled by applyTranslations.
    // If testResults is empty, we might want to show the initial message again,
    // or a "No tests run yet" message.
    if (testResults.length === 0) {
        resultsContainer.innerHTML = `<p>${getString('test_initialMessage')}</p>`;
        return;
    }
    
    resultsContainer.innerHTML = ''; // Clear previous results
    let passes = 0;
    let fails = 0;

    testResults.forEach(result => {
        const resultEl = document.createElement('p');
        resultEl.textContent = result.message; // Message is already translated by assertion functions
        resultEl.className = result.passed ? 'test-pass' : 'test-fail';
        resultsContainer.appendChild(resultEl);
        if (result.passed) passes++;
        else fails++;
    });

    const summaryEl = document.createElement('p');
    summaryEl.innerHTML = `<strong>${getString('test_summary', { passes: passes, fails: fails })}</strong>`;
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
        console.error("Daily results view elements not found."); // Dev message
        return;
    }

    changesContainer.innerHTML = ''; // Clear previous results

    if (dailySimulationResults.changes.length === 0) {
        // The static HTML <p data-translate-key="results_initialMessage"> is handled by applyTranslations.
        // This message is for when simulation runs but there are no changes.
        changesContainer.innerHTML = `<p>${getString('results_noInvestmentChanges')}</p>`;
    } else {
        dailySimulationResults.changes.forEach(change => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('daily-change-item');
            
            // Original string: "{deviceName}: Value changed from {oldValue} to {newValue}. Your investment changed by {investmentChange} points."
            // We need to construct the part with the span separately.
            const baseString = getString('results_changeDetail', {
                deviceName: change.name,
                oldValue: change.oldValue.toFixed(2),
                newValue: change.newValue.toFixed(2),
                investmentChange: change.investmentChange.toFixed(2) // Placeholder for now
            });

            // A bit of a hack to insert the styled span. Ideally, the translation string would allow this.
            // e.g., "...changed by <span class='{class}'>{value}</span> points."
            // Or split the key: "results_changeDetail_part1" and "results_changeDetail_part2"
            // For now, let's replace the numeric part of "investment changed by X points"
            
            const parts = baseString.split(change.investmentChange.toFixed(2)); // Split by the number
            if (parts.length === 2) { // Check if the number was found and split correctly
                 itemDiv.innerHTML = `${parts[0]}<span class="${change.investmentChange >= 0 ? 'positive-return' : 'negative-return'}">${change.investmentChange.toFixed(2)}</span>${parts[1]}`;
            } else {
                // Fallback if the number isn't easily replaceable (e.g. different decimal formatting in translation)
                // This will not have the color styling for the investmentChange part.
                 itemDiv.innerHTML = baseString;
                 console.warn("Could not reliably style investment change for daily results item due to string structure.");
            }
            // A more robust solution would be to have keys like:
            // "results_change_deviceLabel": "{deviceName}: Value changed from {oldValue} to {newValue}.",
            // "results_change_investmentLabel": "Your investment changed by ",
            // "results_change_pointsSuffix": " points."
            // Then construct: itemDiv.innerHTML = `${getString('results_change_deviceLabel', {...})} ${getString('results_change_investmentLabel')} <span class="${...}">${...}</span> ${getString('results_change_pointsSuffix')}`;
            
            changesContainer.appendChild(itemDiv);
        });
    }

    // The static label "Total Portfolio Gain/Loss for the Day: " is handled by applyTranslations.
    // We only update the dynamic part (the number and the " N/A" text).
    if (dailySimulationResults.totalGainLoss === 0 && dailySimulationResults.changes.length === 0) {
        // If simulation hasn't really run or no investments, show N/A
        totalGainLossEl.textContent = getString('results_notAvailable');
        totalGainLossEl.className = ''; // Clear any previous class
    } else {
        totalGainLossEl.textContent = `${dailySimulationResults.totalGainLoss.toFixed(2)} ${getString('home_pointsSuffix').trim()}`;
        totalGainLossEl.className = dailySimulationResults.totalGainLoss >= 0 ? 'positive-return' : 'negative-return';
    }
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
