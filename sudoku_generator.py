import random
import copy

class SudokuGenerator:

    def is_valid(self, board, row, col, num):
        for x in range(9):
            if board[row][x] == num or board[x][col] == num:
                return False

        start_row = row - row % 3
        start_col = col - col % 3

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

    def generate_full_board(self):
        board = [[0] * 9 for _ in range(9)]
        self.solve(board)
        return board

    def generate_puzzle(self, difficulty="medium"):
        solution = self.generate_full_board()
        puzzle = copy.deepcopy(solution)

        remove_map = {
            "easy": 40,
            "medium": 50,
            "hard": 58
        }

        remove_count = remove_map.get(difficulty, 50)

        cells = [(i, j) for i in range(9) for j in range(9)]
        random.shuffle(cells)

        removed = 0
        for row, col in cells:
            if removed >= remove_count:
                break
            puzzle[row][col] = 0
            removed += 1

        return {"puzzle": puzzle, "solution": solution}

    def check_solution(self, board):
        temp = copy.deepcopy(board)
        for i in range(9):
            for j in range(9):
                num = temp[i][j]
                if num == 0:
                    return False
                temp[i][j] = 0
                if not self.is_valid(temp, i, j, num):
                    return False
                temp[i][j] = num
        return True
