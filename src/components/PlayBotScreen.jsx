import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import "./PlayBotScreen.css";

  // Winning combinations (indexes)
  const winningCombinations = [
    [0, 1, 2], // Top row
    [3, 4, 5], // Middle row
    [6, 7, 8], // Bottom row
    [0, 3, 6], // Left column
    [1, 4, 7], // Middle column
    [2, 5, 8], // Right column
    [0, 4, 8], // Diagonal top-left to bottom-right
    [2, 4, 6], // Diagonal top-right to bottom-left
  ];

const PlayBotScreen = () => {
  const [board, setBoard] = useState(Array(9).fill(null)); // 9 squares for a 3x3 board
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); // Track turns (for bot logic later)
  const [playerSymbol, setPlayerSymbol] = useState(""); // Track the player's chosen symbol (X or O)
  const [botSymbol, setBotSymbol] = useState(""); // Track the bot's symbol
  const [showConfigPopup, setShowConfigPopup] = useState(false); // Let animation play initially, then show popup
  const [botShouldMoveFirst, setBotShouldMoveFirst] = useState(false); // Track if bot should move first
  const [winner, setWinner] = useState(null); // Track the winner
  const [isTie, setIsTie] = useState(false); // Track if the game is a tie
  const navigate = useNavigate(); // For navigation back to home
  const [username, setUsername] = useState("Loading..."); // Displayed username
  const ANIMATION_DURATION = 1200; // Duration of the animation in ms

  /****** LOGIC ******/

  // Fetch the username of the logged-in user from Supabase
  useEffect(() => {
    const fetchUsername = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error fetching user:", authError);
        return;
      }

      // Fetch profile data
      const { data, error } = await supabase
        .from("profiles") // Replace "profiles" with your table name if different
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching username:", error);
      } else {
        setUsername(data.username);
      }
    };

    fetchUsername();
  }, []);

  // Handle Quit button click
  const handleQuit = () => {
    navigate("/home"); // Redirect back to home screen
  };

  // Check if there is a winner
  const checkWinner = useCallback((currentBoard) => {
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return currentBoard[a]; // Return "X" or "O" (the winner)
      }
    }
    return null; // No winner
  }, []); // Dependency array is empty because `winningCombinations` is static

// Bot's move logic
const handleBotMove = useCallback(
  (currentBoard) => {
    const emptyIndices = currentBoard
      .map((square, index) => (square === null ? index : null))
      .filter((i) => i !== null);

    if (emptyIndices.length === 0) return; // No moves left (end of game)

    let bestMove = null;

    // 1. Check if the bot can win
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      const values = [currentBoard[a], currentBoard[b], currentBoard[c]];
      if (values.filter((val) => val === botSymbol).length === 2 && values.includes(null)) {
        bestMove = combination[values.indexOf(null)]; // Winning move for bot
        break;
      }
    }

    // 2. Block the player if they’re about to win
    if (bestMove === null) {
      for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        const values = [currentBoard[a], currentBoard[b], currentBoard[c]];
        if (values.filter((val) => val === playerSymbol).length === 2 && values.includes(null)) {
          bestMove = combination[values.indexOf(null)]; // Blocking move
          break;
        }
      }
    }

    // 3. Otherwise, pick a random available square
    if (bestMove === null) {
      const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      bestMove = randomIndex;
    }

    const newBoard = [...currentBoard];
    newBoard[bestMove] = botSymbol; // Bot places its symbol
    setBoard(newBoard); // Update the board state

    // Check for a winner after the bot's move
    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
    } else if (newBoard.every((square) => square !== null)) {
      setIsTie(true); // All squares filled and no winner
    } else {
      setIsPlayerTurn(true); // Player's turn after bot moves
    }
  },
  [botSymbol, playerSymbol, checkWinner, setBoard, setIsPlayerTurn]
);



   // Handle player symbol selection and start the game
   const handleStartMatch = (symbol) => {
    setPlayerSymbol(symbol);
    setBotSymbol(symbol === "X" ? "O" : "X"); // Bot takes the opposite symbol
    setShowConfigPopup(false); // Close the popup

    setIsPlayerTurn(symbol === "X"); // Player goes first if "X", otherwise bot goes first

    if (symbol === "O") {
      setBotShouldMoveFirst(true); // Trigger bot's first move
    }
  };

  useEffect(() => {
    if (botShouldMoveFirst) {
      setTimeout(() => {
        handleBotMove(board); // Make the bot's first move using the latest board state
        setBotShouldMoveFirst(false); // Prevent further automatic first moves
      }, 500);
    }
  }, [botShouldMoveFirst, board, handleBotMove]);

  // Handle player clicking a square
  const handleSquareClick = (index) => {
    if (board[index] || !isPlayerTurn || !playerSymbol || winner || isTie) return;
    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
    } else if (newBoard.every((square) => square !== null)) {
      setIsTie(true); // All squares filled and no winner
    } else {
      setIsPlayerTurn(false);
      setTimeout(() => handleBotMove(newBoard), 500);
    }
  };


  const handlePlayAgain = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsTie(false); // Reset tie state
    setShowConfigPopup(true); // Show configuration popup again
    setIsPlayerTurn(true); // Default to true until the player picks the symbol in the next round
  };
  
  /****** ANIMATION ******/
  useEffect(() => {
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" }
    );

    // Show the config popup after the animation completes
    const timer = setTimeout(() => {
      setShowConfigPopup(true); // Show the configuration overlay
    }, ANIMATION_DURATION);

    // Clean up the timeout to prevent memory leaks
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <button className="quit-button" onClick={handleQuit}>
          Quit
        </button>
        <h1>Bot Match</h1>
  
        <div className="game-wrapper">
          {/* Left: Player Info */}
          <div className="player-info">
            <h3>{username}</h3>
            <p>
              Symbol:{" "}
              <span className={playerSymbol === "X" ? "x-symbol" : "o-symbol"}>
                {playerSymbol}
              </span>
            </p>
          </div>
  
          {/* Game Board */}
          <div className="game-board-wrapper">
            <div className="game-board">
              {board.map((square, index) => (
                <div
                  key={index}
                  className={`square ${
                    square === "X" ? "x-symbol" : square === "O" ? "o-symbol" : ""
                  }`}
                  onClick={() => handleSquareClick(index)}
                >
                  {square}
                </div>
              ))}
            </div>
          </div>
  
          {/* Right: Bot Info */}
          <div className="player-info">
            <h3>Bot</h3>
            <p>
              Symbol:{" "}
              <span className={botSymbol === "X" ? "x-symbol" : "o-symbol"}>
                {botSymbol}
              </span>
            </p>
          </div>
        </div>
      </div>
  
      {/* Configuration Popup */}
      {showConfigPopup && (
        <div className="config-popup-overlay">
          <div className="config-popup-content">
            <h2>Configure Match</h2>
            <p>Choose your symbol:</p>
            <div className="button-group">
              <button
                className="symbol-button"
                onClick={() => handleStartMatch("X")}
              >
                X
              </button>
              <button
                className="symbol-button"
                onClick={() => handleStartMatch("O")}
              >
                O
              </button>
            </div>
            <p>Once you choose your symbol, the game will begin.</p>
            <p>*Bot matches will not affect your record</p>
          </div>
        </div>
      )}
  
      {/* Winner or Tie Popup */}
      {(winner || isTie) && (
        <div className="winner-popup-overlay">
          <div className="winner-popup-content">
            <h2>
              {winner
                ? winner === playerSymbol
                  ? "You Win!"
                  : "You Lost!"
                : "It's a Tie!"}
            </h2>
            <button className="play-again-button" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayBotScreen;
