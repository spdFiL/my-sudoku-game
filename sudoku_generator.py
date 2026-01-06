import random
import copy

class SudokuGenerator:
    def is_valid(self, board, row, col, num):
        for x in range(9):
            if board[row][x] == num or board[x][col] == num:
                return False
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(3):
            for j in range(3):
                if board[start_row + i][start_col + j] == num:
                    return False
        return True

    def solve(self, board):
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    nums = list(range(1, 10))
                    random.shuffle(nums)
                    for num in nums:
                        if self.is_valid(board, i, j, num):
                            board[i][j] = num
                            if self.solve(board):
                                return True
                            board[i][j] = 0
                    return False
        return True

    def generate_puzzle(self, difficulty="medium"):
        full_board = [[0]*9 for _ in range(9)]
        self.solve(full_board)
        solution = copy.deepcopy(full_board)
        
        # ПІДВИЩЕНА СКЛАДНІСТЬ: видаляємо більше цифр
        diff_map = {
            "easy": 40,    # Залишається 41 цифра
            "medium": 52,  # Залишається 29 цифр
            "hard": 62     # Залишається 19 цифр (дуже складно)
        }
        remove_count = diff_map.get(difficulty, 52)
        
        puzzle = copy.deepcopy(full_board)
        cells = [(r, c) for r in range(9) for c in range(9)]
        random.shuffle(cells)
        
        for i in range(remove_count):
            r, c = cells[i]
            puzzle[r][c] = 0
            
        return {"puzzle": puzzle, "solution": solution}