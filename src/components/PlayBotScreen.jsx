import { useEffect, useState } from "react";
import { gsap } from "gsap";
import "./PlayBotScreen.css";

const PlayBotScreen = () => {
  const [board, setBoard] = useState(Array(9).fill(null)); // 9 squares for a 3x3 board
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); // Track turns (for bot logic later)

  /****** ANIMATION ******/
  useEffect(() => {
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  // Handle click on a square
  const handleSquareClick = (index) => {
    if (board[index] || !isPlayerTurn) return; // Prevent overriding or bot's turn
    const newBoard = [...board];
    newBoard[index] = "X"; // Player's move is always "X"
    setBoard(newBoard);
    setIsPlayerTurn(false); // Bot's turn can be implemented later
  };

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1>Bot Match</h1>
        <div className="game-board">
          {board.map((square, index) => (
            <div
              key={index}
              className="square"
              onClick={() => handleSquareClick(index)}
            >
              {square}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayBotScreen;