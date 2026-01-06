import os
from flask import Flask, render_template, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from sudoku_generator import SudokuGenerator
import random
import secrets
from datetime import datetime, timedelta # <--- Додано timedelta

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# ===== НАЛАШТУВАННЯ СЕСІЇ (Щоб ім'я пам'яталось довго) =====
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365) # Пам'ятати 1 рік

# ===== НАЛАШТУВАННЯ БАЗИ ДАНИХ =====
database_url = os.environ.get('DATABASE_URL', 'sqlite:///local_database.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
sudoku_gen = SudokuGenerator()

class PlayerScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    wins = db.Column(db.Integer, default=0)
    time_str = db.Column(db.String(20))
    date_added = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

# ===== МАРШРУТИ =====

@app.route('/')
def index():
    if 'wins' not in session:
        session['wins'] = 0
    # Передаємо ім'я гравця на сторінку (якщо воно є)
    player_name = session.get('player_name', None)
    return render_template('index.html', wins=session['wins'], player_name=player_name)

# НОВИЙ МАРШРУТ: Збереження імені
@app.route('/set_name', methods=['POST'])
def set_name():
    data = request.get_json()
    name = data.get('name')
    if name:
        session['player_name'] = name
        session.permanent = True # Робимо сесію постійною
        return jsonify({'success': True})
    return jsonify({'success': False})

@app.route('/new_game', methods=['POST'])
def new_game():
    data = request.get_json()
    difficulty = data.get('difficulty', 'medium')
    game = sudoku_gen.generate_puzzle(difficulty)

    session['solution'] = game['solution']
    session['initial'] = game['puzzle']
    session['game_over_flag'] = False
    session['start_time'] = datetime.now().timestamp()
    
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
        if not session.get('game_over_flag'):
            session['wins'] = session.get('wins', 0) + 1
            session['game_over_flag'] = True
            
            start = session.get('start_time', datetime.now().timestamp())
            end = datetime.now().timestamp()
            duration_seconds = int(end - start)
            mins = duration_seconds // 60
            secs = duration_seconds % 60
            time_str = f"{mins:02}:{secs:02}"
            
            # ВИКОРИСТОВУЄМО ЗБЕРЕЖЕНЕ ІМ'Я
            name = session.get('player_name', 'Невідомий')
            
            new_score = PlayerScore(name=name, wins=session['wins'], time_str=time_str)
            db.session.add(new_score)
            db.session.commit()
            
            session.modified = True
        return jsonify({'correct': True, 'wins': session['wins']})

    return jsonify({'correct': False})

@app.route('/result')
def result():
    status = request.args.get('status', 'win')
    leaderboard_data = PlayerScore.query.order_by(PlayerScore.wins.desc()).limit(10).all()
    return render_template('result.html', status=status, wins=session.get('wins', 0), leaderboard=leaderboard_data)

if __name__ == '__main__':
    app.run(debug=True)