document.addEventListener('DOMContentLoaded', () => {
    // UI要素
    const boardElement = document.getElementById('game-board');
    const mineCounterElement = document.getElementById('mine-counter');
    const resetButton = document.getElementById('reset-button');
    const timerElement = document.getElementById('timer');
    const gameEndOverlay = document.getElementById('game-end-overlay');
    const gameEndPanel = document.getElementById('game-end-panel');
    const gameEndMessage = document.getElementById('game-end-message');
    const playAgainButton = document.getElementById('play-again-button');
    const howToPlayButton = document.getElementById('how-to-play-button');
    const howToPlayOverlay = document.getElementById('how-to-play-overlay');
    const closeHowToPlayButton = document.getElementById('close-how-to-play');

    // ゲーム設定（固定）
    const rows = 15;
    const cols = 15;
    const minesCount = 40;

    // ゲーム状態
    let board = [];
    let boardDOM = [];
    let firstClick = true;
    let gameOver = false;
    let flagsPlaced = 0;
    let timerInterval;
    let time = 0;

    // --- イベントリスナー ---
    resetButton.addEventListener('click', initializeGame);
    playAgainButton.addEventListener('click', initializeGame);
    howToPlayButton.addEventListener('click', () => {
        howToPlayOverlay.classList.remove('hidden');
    });
    closeHowToPlayButton.addEventListener('click', () => {
        howToPlayOverlay.classList.add('hidden');
    });

    // --- ゲームロジック ---

    function initializeGame() {
        firstClick = true;
        gameOver = false;
        flagsPlaced = 0;
        time = 0;
        resetButton.textContent = '😊';
        gameEndOverlay.classList.add('hidden');

        clearInterval(timerInterval);
        timerElement.textContent = `⏰ ${time}`;

        createBoard();
        updateMineCounter();
    }

    function createBoard() {
        boardElement.innerHTML = '';
        board = Array(rows).fill(null).map(() => Array(cols).fill(null));
        boardDOM = Array(rows).fill(null).map(() => Array(cols).fill(null));

        const table = document.createElement('table');
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                board[r][c] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                };
                const td = document.createElement('td');
                td.dataset.row = r;
                td.dataset.col = c;
                td.addEventListener('click', () => handleCellClick(r, c));
                td.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleRightClick(r, c);
                });
                tr.appendChild(td);
                boardDOM[r][c] = td;
            }
            table.appendChild(tr);
        }
        boardElement.appendChild(table);
    }

    function updateCellDOM(r, c) {
        const cellData = board[r][c];
        const cellDOM = boardDOM[r][c];
        cellDOM.className = '';
        cellDOM.textContent = '';
        cellDOM.dataset.adjacent = '';

        if (cellData.isRevealed) {
            cellDOM.classList.add('revealed');
            if (cellData.isMine) {
                cellDOM.classList.add('mine');
                cellDOM.textContent = '💣';
            } else if (cellData.adjacentMines > 0) {
                cellDOM.textContent = cellData.adjacentMines;
                cellDOM.dataset.adjacent = cellData.adjacentMines;
            }
        } else if (cellData.isFlagged) {
            cellDOM.classList.add('flag');
            cellDOM.textContent = '🚩';
        }
    }

    function placeMines(initialRow, initialCol) {
        let placedMines = 0;
        while (placedMines < minesCount) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            const isInitialArea = Math.abs(r - initialRow) <= 1 && Math.abs(c - initialCol) <= 1;
            if (!board[r][c].isMine && !isInitialArea) {
                board[r][c].isMine = true;
                placedMines++;
            }
        }
        calculateAdjacentMines();
    }

    function calculateAdjacentMines() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMine) continue;
                let count = 0;
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        if (i === 0 && j === 0) continue;
                        const newRow = r + i;
                        const newCol = c + j;
                        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && board[newRow][newCol].isMine) {
                            count++;
                        }
                    }
                }
                board[r][c].adjacentMines = count;
            }
        }
    }

    function handleCellClick(r, c) {
        const cell = board[r][c];
        if (gameOver || cell.isFlagged) return;
        if (cell.isRevealed && cell.adjacentMines > 0) {
            chordClick(r, c);
            return;
        }
        if (cell.isRevealed) return;
        if (firstClick) {
            placeMines(r, c);
            firstClick = false;
            timerInterval = setInterval(() => {
                if (!gameOver) {
                    time++;
                    timerElement.textContent = `⏰ ${time}`;
                }
            }, 1000);
        }
        revealCell(r, c);
        checkWinCondition();
    }

    function chordClick(r, c) {
        const cell = board[r][c];
        let adjacentFlags = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = r + i;
                const newCol = c + j;
                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && board[newRow][newCol].isFlagged) {
                    adjacentFlags++;
                }
            }
        }
        if (adjacentFlags === cell.adjacentMines) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    const newRow = r + i;
                    const newCol = c + j;
                    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && !board[newRow][newCol].isRevealed && !board[newRow][newCol].isFlagged) {
                        revealCell(newRow, newCol);
                    }
                }
            }
            checkWinCondition();
        }
    }

    function revealCell(r, c) {
        if (gameOver || r < 0 || r >= rows || c < 0 || c >= cols) return;
        const cell = board[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        updateCellDOM(r, c);

        if (cell.isMine) {
            endGame(false, r, c);
            return;
        }
        if (cell.adjacentMines === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    revealCell(r + i, c + j);
                }
            }
        }
    }

    function handleRightClick(r, c) {
        if (gameOver || board[r][c].isRevealed) return;
        if (board[r][c].isFlagged) {
            board[r][c].isFlagged = false;
            flagsPlaced--;
        } else {
            if (flagsPlaced < minesCount) {
                board[r][c].isFlagged = true;
                flagsPlaced++;
            }
        }
        updateMineCounter();
        updateCellDOM(r, c);
    }

    const delay = ms => new Promise(res => setTimeout(res, ms));

    async function endGame(isWin, clickedRow, clickedCol) {
        if (gameOver) return;
        gameOver = true;
        clearInterval(timerInterval);
        resetButton.textContent = isWin ? '😎' : '😵';

        if (isWin) {
            gameEndMessage.textContent = 'GAME CLEAR!';
            gameEndPanel.dataset.status = 'win';
            gameEndOverlay.classList.remove('hidden');
        } else {
            gameEndMessage.textContent = 'GAME OVER';
            gameEndPanel.dataset.status = 'lose';

            const mineLocations = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (board[r][c].isMine) mineLocations.push({ r, c });
                }
            }
            mineLocations.sort(() => Math.random() - 0.5);
            const clickedMineIndex = mineLocations.findIndex(m => m.r === clickedRow && m.c === clickedCol);
            if (clickedMineIndex > -1) {
                const [clickedMine] = mineLocations.splice(clickedMineIndex, 1);
                mineLocations.unshift(clickedMine);
            }
            for (const mine of mineLocations) {
                board[mine.r][mine.c].isRevealed = true;
                updateCellDOM(mine.r, mine.c);
                boardDOM[mine.r][mine.c].classList.add('exploded');
                await delay(20);
            }
            // 爆発アニメーションの後にパネルを表示
            setTimeout(() => {
                gameEndOverlay.classList.remove('hidden');
            }, 400);
        }
    }

    function checkWinCondition() {
        if (gameOver) return;
        let revealedSafeCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isRevealed && !board[r][c].isMine) {
                    revealedSafeCount++;
                }
            }
        }
        if (revealedSafeCount === rows * cols - minesCount) {
            endGame(true);
        }
    }

    function updateMineCounter() {
        mineCounterElement.textContent = `💣 ${minesCount - flagsPlaced}`;
    }

    initializeGame();
});