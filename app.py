from flask import Flask, render_template, jsonify, request, session
from sudoku_generator import SudokuGenerator
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

sudoku_gen = SudokuGenerator()

@app.route('/')
def index():
    if 'wins' not in session:
        session['wins'] = 0
    return render_template('index.html', wins=session['wins'])

@app.route('/new_game', methods=['POST'])
def new_game():
    data = request.get_json()
    difficulty = data.get('difficulty', 'medium')

    game = sudoku_gen.generate_puzzle(difficulty)

    session['solution'] = game['solution']
    session['initial'] = game['puzzle']

    return jsonify({'puzzle': game['puzzle']})

@app.route('/check_cell', methods=['POST'])
def check_cell():
    data = request.get_json()
    r, c, v = data['row'], data['col'], data['value']
    solution = session.get('solution')

    return jsonify({'correct': solution[r][c] == v})

@app.route('/check_solution', methods=['POST'])
def check_solution():
    board = request.get_json()['board']
    solution = session.get('solution')

    if board == solution:
        session['wins'] += 1
        return jsonify({'correct': True, 'wins': session['wins']})

    return jsonify({'correct': False})

@app.route('/hint', methods=['POST'])
def hint():
    import random

    board = request.get_json()['board']
    solution = session['solution']
    initial = session['initial']

    empty = [(i, j) for i in range(9) for j in range(9)
             if board[i][j] == 0 and initial[i][j] == 0]

    if not empty:
        return jsonify({'error': True})

    r, c = random.choice(empty)
    return jsonify({'row': r, 'col': c, 'value': solution[r][c]})

if __name__ == '__main__':
    app.run(debug=True)
