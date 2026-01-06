let board = [];
let selected = null;
let hints = 3;
let lives = 3;
let timerId = null;
let time = 0;
let fixedCells = new Set();
let isGameOver = false;
let isHintBusy = false;
let completedNumbers = new Set(); // Зберігає цифри, яких вже є 9 штук

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
    
    // Скидаємо кнопки
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
        updateNumberStatus(false); // Оновлюємо статус, але без анімації на старті
        drawBoard();
        startTimer();
    });
}

function drawBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    
    const selRow = selected !== null ? Math.floor(selected / 9) : null;
    const selCol = selected !== null ? selected % 9 : null;
    
    // Отримуємо значення вибраної клітинки для підсвічування однакових
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
            
            // Якщо цифра завершена, додаємо їй клас для статики (щоб лишалась зеленою)
            if (completedNumbers.has(val)) {
                cell.classList.add('fixed-done'); 
            }
        }

        // Логіка підсвічування
        if (selected === i) {
            cell.classList.add('selected');
        } else if (selectedValue !== null && val === selectedValue && val !== 0) {
            // Підсвічуємо всі такі самі цифри
            cell.classList.add('same-number');
        } else if (r === selRow || c === selCol) {
            // Підсвічуємо хрест (рядок і стовпець)
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

// Функція для перевірки, чи всі 9 цифр розставлені
function updateNumberStatus(animate = true) {
    const counts = Array(10).fill(0);
    board.flat().forEach(num => {
        if (num !== 0) counts[num]++;
    });

    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById(`btn-num-${i}`);
        
        // Якщо цифри стало 9 штук
        if (counts[i] >= 9) {
            // Якщо це сталося вперше (ми ще не зафіксували це)
            if (!completedNumbers.has(i)) {
                completedNumbers.add(i);
                btn.classList.add('btn-disabled'); // Робимо кнопку сірою
                
                if (animate) {
                    animateCompletedNumber(i);
                }
            }
        } else {
            // Якщо цифру видалили і їх стало менше 9, повертаємо активність
            if (completedNumbers.has(i)) {
                completedNumbers.delete(i);
                btn.classList.remove('btn-disabled');
            }
        }
    }
}

// Функція анімації для завершеної цифри
function animateCompletedNumber(num) {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        const r = Math.floor(index / 9);
        const c = index % 9;
        if (board[r][c] === num) {
            cell.classList.add('completed-set');
            // Прибираємо клас анімації після завершення
            setTimeout(() => {
                cell.classList.remove('completed-set');
            }, 800); // Час має збігатися з тривалістю анімації в CSS
        }
    });
}

function setNumber(n) {
    if (isGameOver || selected === null || fixedCells.has(selected)) return;
    
    // Якщо така цифра вже зібрана (9 штук), забороняємо ставити (окрім стирання 0)
    if (n !== 0 && completedNumbers.has(n)) return;

    const r = Math.floor(selected / 9);
    const c = selected % 9;
    
    // Якщо клікаємо ту ж саму цифру — ігноруємо
    if (board[r][c] === n) return;
    
    board[r][c] = n;
    
    // Спочатку відправляємо запит на сервер
    fetch('/check_cell', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({row: r, col: c, value: n})
    })
    .then(res => res.json())
    .then(data => {
        // 1. Спочатку перемальовуємо дошку
        drawBoard(); 
        
        // 2. Тепер, коли HTML оновлено, запускаємо перевірку на 9 цифр і анімацію
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

            // ЛОГІКА ПРОГРАШУ
            if (lives <= 0) {
                isGameOver = true;
                clearInterval(timerId);
                
                // Перенаправлення на сторінку поразки
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
            
            drawBoard(); // Спочатку малюємо
            updateNumberStatus(true); // Потім анімуємо, якщо це була остання цифра
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
            
            // ЛОГІКА ПЕРЕМОГИ
            // Перенаправлення на сторінку перемоги
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

document.addEventListener('DOMContentLoaded', newGame);