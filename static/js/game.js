// ===== МУЗИЧНИЙ ПЛЕЄР =====
const MusicPlayer = {
    // Впиши сюди назви своїх файлів, які ти закинув у папку static/music
    playlist: [
        'track1.mp3',
        'track2.mp3', 
        'track3.mp3'
    ],
    currentIndex: 0,
    audio: new Audio(),
    isPlaying: false,

    init() {
        this.audio.volume = 0.3; // Гучність 30%
        
        // Коли пісня закінчується, вмикаємо наступну
        this.audio.addEventListener('ended', () => {
            this.next();
        });
        
        // Оновлюємо інтерфейс
        this.updateUI();
    },

    play(index) {
        if (this.playlist.length === 0) return;

        if (typeof index === 'number') {
            this.currentIndex = index;
            // Корекція індексу (циклічність)
            if (this.currentIndex >= this.playlist.length) this.currentIndex = 0;
            if (this.currentIndex < 0) this.currentIndex = this.playlist.length - 1;
            
            this.audio.src = `/static/music/${this.playlist[this.currentIndex]}`;
            this.audio.load();
        }

        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updateUI();
        }).catch(e => console.log("Потрібна взаємодія з користувачем для автоплею"));
    },

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updateUI();
    },

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            if (!this.audio.src) {
                this.play(0); 
            } else {
                this.play(); 
            }
        }
    },

    next() {
        this.play(this.currentIndex + 1);
    },

    prev() {
        this.play(this.currentIndex - 1);
    },

    updateUI() {
        const btn = document.getElementById('btn-play-pause');
        const info = document.getElementById('track-name');
        const wave = document.getElementById('music-wave');

        if (this.playlist.length === 0) {
            info.textContent = "Немає пісень";
            return;
        }

        if (this.isPlaying) {
            btn.textContent = "⏸"; 
            btn.classList.add('active');
            info.textContent = `Грає: Трек ${this.currentIndex + 1}`;
            wave.style.opacity = 1;
        } else {
            btn.textContent = "▶"; 
            btn.classList.remove('active');
            info.textContent = "На паузі";
            wave.style.opacity = 0;
        }
    }
};

// Зробимо плеєр доступним глобально
window.musicPlayer = MusicPlayer;

// ===== ОСНОВНА ЛОГІКА ГРИ =====
let board = [];
let selected = null;
let hints = 3;
let lives = 3;
let timerId = null;
let time = 0;
let fixedCells = new Set();
let isGameOver = false;
let isHintBusy = false;
let completedNumbers = new Set(); 

function resetLivesUI() {
    lives = 3;
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach(h => h.classList.remove('lost'));
}

function newGame() {
    const diff = document.getElementById('difficulty').value;
    isGameOver = false;
    isHintBusy = false;
    selected = null;
    completedNumbers.clear();
    
    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById(`btn-num-${i}`);
        if (btn) btn.classList.remove('btn-disabled');
    }

    resetLivesUI();
    
    fetch('/new_game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({difficulty: diff})
    })
    .then(r => r.json())
    .then(data => {
        board = data.puzzle;
        fixedCells.clear();
        board.flat().forEach((v, i) => { if (v !== 0) fixedCells.add(i); });
        hints = 3;
        document.getElementById('hints').textContent = hints;
        updateNumberStatus(false); 
        drawBoard();
        startTimer();
    });
}

function drawBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    
    const selRow = selected !== null ? Math.floor(selected / 9) : null;
    const selCol = selected !== null ? selected % 9 : null;
    
    let selectedValue = null;
    if (selected !== null) {
        selectedValue = board[selRow][selCol];
    }

    board.flat().forEach((val, i) => {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const cell = document.createElement('div');
        cell.className = 'cell';
        
        if (val !== 0) {
            cell.textContent = val;
            cell.classList.add(fixedCells.has(i) ? 'fixed' : 'user-input');
            
            if (completedNumbers.has(val)) {
                cell.classList.add('fixed-done'); 
            }
        }

        if (selected === i) {
            cell.classList.add('selected');
        } else if (selectedValue !== null && val === selectedValue && val !== 0) {
            cell.classList.add('same-number');
        } else if (r === selRow || c === selCol) {
            cell.classList.add('highlight');
        }

        cell.onclick = () => {
            if (!isGameOver) {
                selected = i;
                drawBoard();
            }
        };
        container.appendChild(cell);
    });
}

function updateNumberStatus(animate = true) {
    const counts = Array(10).fill(0);
    board.flat().forEach(num => {
        if (num !== 0) counts[num]++;
    });

    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById(`btn-num-${i}`);
        
        if (counts[i] >= 9) {
            if (!completedNumbers.has(i)) {
                completedNumbers.add(i);
                btn.classList.add('btn-disabled'); 
                
                if (animate) {
                    animateCompletedNumber(i);
                }
            }
        } else {
            if (completedNumbers.has(i)) {
                completedNumbers.delete(i);
                btn.classList.remove('btn-disabled');
            }
        }
    }
}

function animateCompletedNumber(num) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const r = Math.floor(index / 9);
        const c = index % 9;
        if (board[r][c] === num) {
            cell.classList.add('completed-set');
            setTimeout(() => {
                cell.classList.remove('completed-set');
            }, 800); 
        }
    });
}

function setNumber(n) {
    if (isGameOver || selected === null || fixedCells.has(selected)) return;
    
    if (n !== 0 && completedNumbers.has(n)) return;

    const r = Math.floor(selected / 9);
    const c = selected % 9;
    
    if (board[r][c] === n) return;
    
    board[r][c] = n;
    
    fetch('/check_cell', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({row: r, col: c, value: n})
    })
    .then(res => res.json())
    .then(data => {
        drawBoard(); 
        updateNumberStatus(true);

        if (n !== 0 && !data.correct) {
            const cells = document.querySelectorAll('.cell');
            if (cells[selected]) {
                cells[selected].classList.add('error');
            }
            
            lives--;
            const hearts = document.querySelectorAll('.heart:not(.lost)');
            if (hearts.length > 0) {
                hearts[hearts.length - 1].classList.add('lost');
            }
            
            const gameContainer = document.querySelector('.container');
            gameContainer.classList.add('shake-screen');
            setTimeout(() => gameContainer.classList.remove('shake-screen'), 400);

            if (lives <= 0) {
                isGameOver = true;
                clearInterval(timerId);
                setTimeout(() => {
                    window.location.href = "/result?status=lose";
                }, 500);
            }
        }
    });
}

function getHint() {
    if (isGameOver || hints <= 0 || isHintBusy) return;
    isHintBusy = true;

    fetch('/get_hint', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board: board})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            board[data.row][data.col] = data.value;
            hints--;
            document.getElementById('hints').textContent = hints;
            drawBoard(); 
            updateNumberStatus(true);
        }
    })
    .finally(() => isHintBusy = false);
}

function checkSolution() {
    if (isGameOver) return;
    fetch('/check_solution', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board: board})
    })
    .then(r => r.json())
    .then(data => {
        if (data.correct) {
            isGameOver = true;
            clearInterval(timerId);
            setTimeout(() => {
                window.location.href = "/result?status=win";
            }, 500);
            
        } else {
            alert("❌ Помилка в рішенні. Перевірте ще раз!");
        }
    });
}

function startTimer() {
    clearInterval(timerId);
    time = 0;
    timerId = setInterval(() => {
        time++;
        const m = String(Math.floor(time / 60)).padStart(2, '0');
        const s = String(time % 60).padStart(2, '0');
        document.getElementById('timer').textContent = `${m}:${s}`;
    }, 1000);
}

// ===== ЛОГІКА РЕЄСТРАЦІЇ =====
function checkRegistration() {
    if (!savedPlayerName || savedPlayerName === '') {
        document.getElementById('registration-modal').style.display = 'flex';
    }
}

function savePlayerName() {
    const nameInput = document.getElementById('player-name-input');
    const name = nameInput.value.trim();

    if (name.length < 2) {
        alert("Ім'я має бути мінімум 2 символи!");
        return;
    }

    fetch('/set_name', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('registration-modal').style.display = 'none';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    newGame();
    checkRegistration();
    MusicPlayer.init(); // <--- Ініціалізація музики
});