from flask import Flask, send_from_directory, request, jsonify
import json
import os
import threading

# Import the simulation function
from simulate import update_all_device_values

app = Flask(__name__)

# Path to the data file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')

# Lock for thread-safe file operations
file_lock = threading.Lock()

# API endpoint to get current game data
@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        with file_lock:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "Data file not found. Please initialize data first."}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Error decoding data file."}), 500

# API endpoint to make an investment
@app.route('/api/invest', methods=['POST'])
def invest():
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "Invalid request: No JSON payload provided."}), 400

        device_id = payload.get('deviceId')
        amount = payload.get('amount')

        if not device_id or not isinstance(device_id, str):
            return jsonify({"error": "Invalid request: 'deviceId' is missing or invalid."}), 400
        if not isinstance(amount, (int, float)) or amount <= 0:
            return jsonify({"error": "Invalid request: 'amount' must be a positive number."}), 400

        with file_lock:
            try:
                with open(DATA_FILE, 'r+') as f:
                    data = json.load(f)
                    
                    # Validate deviceId
                    device_exists = any(d['id'] == device_id for d in data.get('devices', []))
                    if not device_exists:
                        return jsonify({"error": f"Device with id '{device_id}' not found."}), 404

                    # Validate user points
                    user_points = data.get('user', {}).get('point_balance', 0)
                    if user_points < amount:
                        return jsonify({"error": "Insufficient point balance."}), 400

                    # Update data
                    data['user']['point_balance'] = round(user_points - amount, 2)
                    if 'investments' not in data['user']:
                        data['user']['investments'] = {}
                    
                    current_investment = data['user']['investments'].get(device_id, 0)
                    data['user']['investments'][device_id] = round(current_investment + amount, 2)

                    # Write updated data back to file
                    f.seek(0)
                    json.dump(data, f, indent=2)
                    f.truncate()
                
                return jsonify({
                    "message": "Investment successful.",
                    "updated_point_balance": data['user']['point_balance'],
                    "investments": data['user']['investments']
                })

            except FileNotFoundError:
                return jsonify({"error": "Data file not found. Cannot process investment."}), 500
            except json.JSONDecodeError:
                return jsonify({"error": "Error decoding data file. Cannot process investment."}), 500
            except Exception as e: # Catch any other unexpected errors during file processing
                return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
                
    except Exception as e: # Catch errors like payload not being JSON
        return jsonify({"error": f"Invalid request format: {str(e)}"}), 400

# API endpoint to run the simulation
@app.route('/api/simulate', methods=['POST'])
def run_simulation():
    with file_lock:
        try:
            with open(DATA_FILE, 'r+') as f:
                data = json.load(f)
                
                # Call the simulation logic from simulate.py
                updated_data = update_all_device_values(data) # Modifies data in-place
                
                # Write updated data back to file
                f.seek(0)
                json.dump(updated_data, f, indent=2)
                f.truncate()
            
            return jsonify(updated_data)

        except FileNotFoundError:
            return jsonify({"error": "Data file not found. Cannot run simulation."}), 500
        except json.JSONDecodeError:
            return jsonify({"error": "Error decoding data file. Cannot run simulation."}), 500
        except Exception as e: # Catch any other unexpected errors
            return jsonify({"error": f"An unexpected error occurred during simulation: {str(e)}"}), 500

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>.js')
def serve_js(filename):
    return send_from_directory('.', f"{filename}.js")

@app.route('/<path:filename>.css')
def serve_css(filename):
    return send_from_directory('.', f"{filename}.css")

@app.route('/locales/<path:filename>')
def serve_locales(filename):
    return send_from_directory('locales', filename)

@app.route('/data.json')
def serve_data():
    return send_from_directory('.', 'data.json')

if __name__ == '__main__':
    app.run(debug=True)
