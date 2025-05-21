# Device Investment Simulator

## Overview
A web application that simulates investing in virtual devices. Users can manage a portfolio, invest points in various devices, and observe how their investments change over simulated days. The application features a dynamic frontend and a Python Flask backend. It also supports multiple languages.

## Project Structure
```
/
├── app.py                # Flask backend server
├── data.json             # Data file for device info, user balance, and investments
├── index.html            # Main HTML page
├── script.js             # Frontend JavaScript logic
├── simulate.py           # Python script with simulation logic (used by app.py)
├── style.css             # CSS styles
├── locales/              # Directory for language files (en.json, ko.json, ja.json)
│   ├── en.json
│   ├── ko.json
│   └── ja.json
└── README.md             # This file
```

## Features
*   View current point balance and investment portfolio.
*   Browse available devices for investment with their current values and trends.
*   Invest points in devices.
*   Simulate daily changes in device values and portfolio.
*   Language selection (English, Korean, Japanese).
*   Basic client-side test runner for some JavaScript functions.

## Setup and Running the Web Service

### Prerequisites
*   Python 3.x
*   Flask (Python library)

### Installation
1.  **Clone the repository (if applicable) or download the files.**
2.  **Navigate to the project directory:**
    ```bash
    cd path/to/project-directory
    ```
3.  **Install Flask:**
    It's recommended to use a virtual environment.
    ```bash
    # Create a virtual environment (optional but recommended)
    python -m venv venv
    # Activate the virtual environment
    # On Windows:
    # venv\Scripts\activate
    # On macOS/Linux:
    # source venv/bin/activate

    # Install Flask
    pip install Flask
    ```

### Running the Application
1.  **Ensure you are in the project's root directory.**
2.  **Run the Flask application:**
    ```bash
    python app.py
    ```
3.  **Open your web browser and go to:**
    `http://127.0.0.1:5000/`

The application should now be running.

## API Endpoints
The backend (`app.py`) provides the following API endpoints:

*   **`GET /api/data`**
    *   Description: Retrieves all current application data, including device information, user balance, and investments.
    *   Response: JSON object containing the application data.

*   **`POST /api/invest`**
    *   Description: Processes a new investment from the user.
    *   Request Body (JSON):
        ```json
        {
          "deviceId": "string", // ID of the device to invest in
          "amount": "number"    // Amount of points to invest
        }
        ```
    *   Response: JSON object indicating success or failure, along with updated user data or an error message.
        ```json
        // Example success
        { "success": true, "message": "Investment successful.", "user_data": { ... } }
        // Example error
        { "success": false, "message": "Insufficient points." }
        ```

*   **`POST /api/simulate`**
    *   Description: Triggers a new simulation round. Device values are updated, and portfolio values are recalculated based on these changes.
    *   Response: JSON object containing the complete updated application data after the simulation.

## How Simulation Works
The simulation logic (`simulate.py` and used by `app.py`) updates each device's value based on its current trend ("up", "down", or "stable").
*   **Up trend:** Value increases by 1% to 10%.
*   **Down trend:** Value decreases by 1% to 10%.
*   **Stable trend:** Value changes by -2% to +2%.
There's also a small chance (10%) for a device's trend to change randomly after each simulation round.

## Frontend
The frontend is built with HTML, CSS, and vanilla JavaScript.
*   `index.html`: Structure of the application.
*   `script.js`: Handles all client-side logic, UI updates, API interactions, and internationalization.
*   `style.css`: Styles the application.
*   `locales/`: Contains JSON files for translations.

The frontend dynamically updates based on data received from the backend API and user interactions.
