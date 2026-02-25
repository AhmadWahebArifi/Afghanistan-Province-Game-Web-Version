class AfghanistanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.provinces = [];
        this.guessedProvinces = [];
        this.startTime = Date.now();
        this.gameActive = true;
        this.mapImage = new Image();
        
        this.initializeGame();
        this.setupEventListeners();
        this.startTimer();
    }

    async initializeGame() {
        try {
            // Load provinces data
            const response = await fetch('/api/provinces');
            this.provinces = await response.json();
            
            // Load map image
            this.mapImage.src = '/blank_states.gif';
            this.mapImage.onload = () => {
                this.drawMap();
            };
            
            // Adjust coordinates for canvas (scale and center)
            this.adjustCoordinates();
        } catch (error) {
            console.error('Error initializing game:', error);
            this.showFeedback('Error loading game data', 'error');
        }
    }

    adjustCoordinates() {
        // Convert CSV coordinates to canvas coordinates
        // Original coordinates range from -261 to 155 (x) and -167 to 159 (y)
        // Canvas is 800x600, we need to scale and center
        
        const minX = -261, maxX = 155;
        const minY = -167, maxY = 159;
        
        const scaleX = 600 / (maxX - minX); // Use 600 width to leave margins
        const scaleY = 400 / (maxY - minY); // Use 400 height to leave margins
        
        this.provinces.forEach(province => {
            province.canvasX = (province.x - minX) * scaleX + 100; // 100px left margin
            province.canvasY = (maxY - province.y) * scaleY + 100; // 100px top margin, flip Y
        });
    }

    drawMap() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map image
        if (this.mapImage.complete) {
            this.ctx.drawImage(this.mapImage, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw guessed provinces
        this.guessedProvinces.forEach(provinceName => {
            const province = this.provinces.find(p => p.state === provinceName);
            if (province) {
                this.drawProvince(province);
            }
        });
    }

    drawProvince(province) {
        this.ctx.save();
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillStyle = '#006400'; // Dark green
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Add shadow for better visibility
        this.ctx.shadowColor = 'white';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        this.ctx.fillText(province.state, province.canvasX, province.canvasY);
        this.ctx.restore();
    }

    setupEventListeners() {
        const input = document.getElementById('provinceInput');
        const submitBtn = document.getElementById('submitBtn');
        const exitBtn = document.getElementById('exitBtn');
        const playAgainBtn = document.getElementById('playAgainBtn');

        submitBtn.addEventListener('click', () => this.checkAnswer());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });
        
        exitBtn.addEventListener('click', () => this.exitGame());
        playAgainBtn.addEventListener('click', () => this.resetGame());
    }

    async checkAnswer() {
        if (!this.gameActive) return;
        
        const input = document.getElementById('provinceInput');
        const answer = input.value.trim();
        
        if (!answer) return;
        
        try {
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answer: answer })
            });
            
            const result = await response.json();
            
            if (result.correct) {
                if (this.guessedProvinces.includes(result.name)) {
                    this.showFeedback('Already guessed!', 'warning');
                } else {
                    this.guessedProvinces.push(result.name);
                    this.drawMap();
                    this.updateScore();
                    this.showFeedback('Correct!', 'success');
                    
                    if (this.guessedProvinces.length === this.provinces.length) {
                        this.winGame();
                    }
                }
            } else {
                this.showFeedback('Not a valid province!', 'error');
            }
            
            input.value = '';
            input.focus();
            
        } catch (error) {
            console.error('Error checking answer:', error);
            this.showFeedback('Error checking answer', 'error');
        }
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
        
        setTimeout(() => {
            feedback.textContent = '';
            feedback.className = 'feedback';
        }, 2000);
    }

    updateScore() {
        const scoreText = document.getElementById('score-text');
        scoreText.textContent = `${this.guessedProvinces.length}/34 Provinces Correct`;
    }

    startTimer() {
        setInterval(() => {
            if (!this.gameActive) return;
            
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            document.getElementById('timer').textContent = 
                `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    async exitGame() {
        if (!this.gameActive) return;
        
        this.gameActive = false;
        
        try {
            await fetch('/api/save_progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guessed: this.guessedProvinces })
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
        
        this.showGameOver(false);
    }

    winGame() {
        this.gameActive = false;
        this.showGameOver(true);
    }

    showGameOver(won) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        if (won) {
            title.textContent = '🎉 Congratulations!';
            message.textContent = `You guessed all 34 provinces!\nTime: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            title.textContent = 'Game Over!';
            message.textContent = `You guessed ${this.guessedProvinces.length}/34 provinces\nTime: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        modal.style.display = 'flex';
    }

    resetGame() {
        this.guessedProvinces = [];
        this.startTime = Date.now();
        this.gameActive = true;
        
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('provinceInput').value = '';
        document.getElementById('feedback').textContent = '';
        
        this.updateScore();
        this.drawMap();
        document.getElementById('provinceInput').focus();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AfghanistanGame();
});
