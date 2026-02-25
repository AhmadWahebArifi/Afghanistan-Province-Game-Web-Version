from flask import Flask, render_template, request, jsonify, send_from_directory
import pandas
import json
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/provinces')
def get_provinces():
    """Get all provinces with their coordinates"""
    try:
        data = pandas.read_csv("Afghanistan_Provinces.csv")
        provinces = data.to_dict('records')
        return jsonify(provinces)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check', methods=['POST'])
def check_province():
    """Check if a province name is correct"""
    try:
        data = pandas.read_csv("Afghanistan_Provinces.csv")
        all_states = data.state.to_list()
        answer = request.json.get('answer', '').title().strip()
        
        if answer in all_states:
            state_data = data[data.state == answer]
            return jsonify({
                'correct': True,
                'x': int(state_data.x.iloc[0]),
                'y': int(state_data.y.iloc[0]),
                'name': answer
            })
        else:
            return jsonify({'correct': False})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/save_progress', methods=['POST'])
def save_progress():
    """Save missed provinces to CSV"""
    try:
        data = pandas.read_csv("Afghanistan_Provinces.csv")
        all_states = data.state.to_list()
        guessed = request.json.get('guessed', [])
        missed = [state for state in all_states if state not in guessed]
        
        missed_data = pandas.DataFrame(missed, columns=['state'])
        missed_data.to_csv("states_to_learn.csv", index=False)
        
        return jsonify({'success': True, 'missed_count': len(missed)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files like images"""
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)
