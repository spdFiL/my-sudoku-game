from flask import Flask, render_template, jsonify, request, session
from sudoku_generator import SudokuGenerator
import random
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
    session['game_over_flag'] = False # Захист від повторних очок
    return jsonify({'puzzle': game['puzzle']})

@app.route('/check_cell', methods=['POST'])
def check_cell():
    data = request.get_json()
    r, c, v = data['row'], data['col'], data['value']
    solution = session.get('solution')
    return jsonify({'correct': solution[r][c] == v if solution else False})

@app.route('/get_hint', methods=['POST'])
def get_hint():
    board = request.get_json().get('board')
    solution = session.get('solution')
    initial = session.get('initial')

    if not solution or not board:
        return jsonify({'success': False})

    # Шукаємо порожню або неправильну клітинку, яка не була початковою
    choices = []
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0 and initial[r][c] == 0:
                choices.append((r, c))

    if not choices:
        return jsonify({'success': False})

    r, c = random.choice(choices)
    return jsonify({'success': True, 'row': r, 'col': c, 'value': solution[r][c]})

@app.route('/check_solution', methods=['POST'])
def check_solution():
    board = request.get_json().get('board')
    solution = session.get('solution')

    if board == solution:
        # Додаємо виграш, тільки якщо гра ще не була позначена як завершена
        if not session.get('game_over_flag'):
            session['wins'] = session.get('wins', 0) + 1
            session['game_over_flag'] = True
            session.modified = True
        return jsonify({'correct': True, 'wins': session['wins']})

    return jsonify({'correct': False})

if __name__ == '__main__':
    app.run(debug=True)