import random

def simulate_value_change(value: float, trend: str) -> float:
    """
    Simulates a change in a device's value based on its trend.
    """
    # Define the delta ranges for each trend
    delta = {
        "up": random.uniform(1.01, 1.10),  # Value increases by 1% to 10%
        "down": random.uniform(0.90, 0.99),  # Value decreases by 1% to 10%
        "stable": random.uniform(0.98, 1.02)  # Value changes by -2% to +2%
    }
    
    # Ensure the trend is valid, default to "stable" if not
    if trend not in delta:
        trend = "stable"
        
    return round(value * delta[trend], 2)

def update_all_device_values(data: dict) -> dict:
    """
    Updates the values of all devices in the data structure and may change their trends.
    """
    if "devices" not in data:
        print("Error: 'devices' key not found in data.")
        return data

    trends = ["up", "down", "stable"]
    trend_change_probability = 0.1 # 10% chance to change trend

    for device in data["devices"]:
        if "value" in device and "trend" in device:
            device["value"] = simulate_value_change(device["value"], device["trend"])
            
            # Optionally change trend
            if random.random() < trend_change_probability:
                current_trend_index = trends.index(device["trend"]) if device["trend"] in trends else -1
                available_trends = trends[:]
                if current_trend_index != -1:
                    available_trends.pop(current_trend_index)
                
                if available_trends: # Ensure there's something to pick from if original trend was invalid
                    device["trend"] = random.choice(available_trends)
        else:
            print(f"Warning: Device {device.get('name', 'Unknown')} missing 'value' or 'trend'.")
            
    return data

if __name__ == "__main__":
    import json
    import os

    # Determine the correct path to data.json relative to simulate.py
    # Assuming simulate.py is in the root directory along with data.json
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_file_path = os.path.join(current_dir, "data.json")

    try:
        with open(data_file_path, 'r') as f:
            initial_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {data_file_path} not found. Make sure it's in the same directory as simulate.py.")
        # Create a dummy data structure if file not found, for demonstration
        initial_data = {
            "devices": [
                { "id": "tv", "name": "TV", "value": 120, "trend": "up" },
                { "id": "fridge", "name": "Refrigerator", "value": 100, "trend": "stable" },
                { "id": "phone", "name": "Smartphone", "value": 700, "trend": "up" }
            ],
            "user": { "point_balance": 1000, "investments": {} }
        }
        print("Using dummy data for demonstration.")
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {data_file_path}.")
        initial_data = {"devices": []} # Fallback to empty devices

    print("Initial data:")
    print(json.dumps(initial_data, indent=2))

    updated_data = update_all_device_values(initial_data.copy()) # Use .copy() to avoid modifying initial_data directly if needed elsewhere

    print("\nUpdated data after one simulation round:")
    print(json.dumps(updated_data, indent=2))

    # Example of running a few more rounds
    for i in range(3):
        updated_data = update_all_device_values(updated_data)
        print(f"\nUpdated data after simulation round {i+2}:")
        print(json.dumps(updated_data, indent=2))
