import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import CoinFlip from "./CoinFlip"; // Ensure this component is implemented
import "./GameScreen.css";

// Define the winning combinations for tic tac toe
const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const GameScreen = () => {
  const { gameId } = useParams(); // Get the game id from the URL
  const navigate = useNavigate();

  // Local state variables
  const [board, setBoard] = useState(Array(9).fill(null)); // Game board
  const [currentTurn, setCurrentTurn] = useState(null); // "player_1" or "player_2"
  const [winner, setWinner] = useState(null); // Winner ("player_1" or "player_2")
  const [isTie, setIsTie] = useState(false); // Tie flag
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [gameData, setGameData] = useState(null);
  
  // New state for the coin flip outcome (either "player_1" or "player_2")
  const [coinFlipOutcome, setCoinFlipOutcome] = useState(null);

  // Local symbols for the current user and opponent
  const [mySymbol, setMySymbol] = useState("");
  const [opponentSymbol, setOpponentSymbol] = useState("");
  // The role of the current user ("player_1" or "player_2")
  const [playerRole, setPlayerRole] = useState("");

  // Usernames (fetched from profiles)
  const [username, setUsername] = useState("Loading...");
  const [opponentName, setOpponentName] = useState("Loading...");

  // New state to store current user's id
  const [userId, setUserId] = useState(null);

  // On mount: fetch current user and game record from Supabase
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // 1. Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error("Auth error:", authError);
          return;
        }
        setUserId(user.id);

        // 2. Fetch the game record by gameId
        const { data: game, error: gameError } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .single();
        if (gameError) {
          console.error("Error fetching game:", gameError);
          return;
        }
        setGameData(game);
        setBoard(JSON.parse(game.board));
        setCurrentTurn(game.current_turn);

        // 3. Determine the player's role based on the game record
        if (game.player_1 === user.id) {
          setPlayerRole("player_1");
        } else if (game.player_2 === user.id) {
          setPlayerRole("player_2");
        }

        // 4. Handle symbol assignment
        if (!game.symbol_x && !game.symbol_o) {
          // Pre-determine coin flip outcome on the server side
          const flipOutcome = Math.random() < 0.5 ? "player_1" : "player_2";
          // Calculate symbols based on outcome
          const assignedSymbolX = flipOutcome === "player_1" ? game.player_1 : game.player_2;
          const assignedSymbolO = flipOutcome === "player_1" ? game.player_2 : game.player_1;
          const updatedTurn = flipOutcome; // X always goes first

          // Use a conditional update so only one client updates the record
          const { error: updateError } = await supabase
            .from("games")
            .update({
              symbol_x: assignedSymbolX,
              symbol_o: assignedSymbolO,
              current_turn: updatedTurn,
            })
            .eq("id", gameId)
            .is("symbol_x", null); // Only update if symbol_x is still null

          if (!updateError) {
            // Store the pre-determined outcome for visual effect
            setCoinFlipOutcome(flipOutcome);
            setShowCoinFlip(true);
          } else {
            // If the update failed because someone else already updated, use stored symbols
            if (user.id === game.symbol_x) {
              setMySymbol("X");
              setOpponentSymbol("O");
            } else if (user.id === game.symbol_o) {
              setMySymbol("O");
              setOpponentSymbol("X");
            }
          }
        } else {
          // Symbols already assigned; update local state accordingly
          if (user.id === game.symbol_x) {
            setMySymbol("X");
            setOpponentSymbol("O");
          } else if (user.id === game.symbol_o) {
            setMySymbol("O");
            setOpponentSymbol("X");
          }
        }

        // 5. Fetch the current user's profile (username)
        const { data: userProfile, error: userProfileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (userProfileError) {
          console.error("Error fetching current user's profile:", userProfileError);
        } else {
          setUsername(userProfile.username);
        }

        // 6. Determine the opponent's id based on player role
        const opponentId = game.player_1 === user.id ? game.player_2 : game.player_1;

        // 7. Fetch the opponent's profile (username)
        const { data: opponentProfile, error: opponentProfileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", opponentId)
          .single();
        if (opponentProfileError) {
          console.error("Error fetching opponent's profile:", opponentProfileError);
        } else {
          setOpponentName(opponentProfile.username);
        }
      } catch (err) {
        console.error("Error in fetchGameData:", err);
      }
    };

    fetchGameData();
  }, [gameId]);

  // Callback to handle coin flip animation completion (visual effect only)
  const handleCoinFlipComplete = async () => {
    if (!gameData || !userId || !coinFlipOutcome) return;

    // Use the pre-determined outcome to set local symbol state.
    if (coinFlipOutcome === "player_1") {
      if (userId === gameData.player_1) {
        setMySymbol("X");
        setOpponentSymbol("O");
      } else {
        setMySymbol("O");
        setOpponentSymbol("X");
      }
    } else { // coinFlipOutcome === "player_2"
      if (userId === gameData.player_2) {
        setMySymbol("X");
        setOpponentSymbol("O");
      } else {
        setMySymbol("O");
        setOpponentSymbol("X");
      }
    }
    // Hide the coin flip overlay
    setShowCoinFlip(false);
  };

  // Real-time subscription to listen for updates to the game record
  useEffect(() => {
    const gameChannel = supabase
      .channel("game-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updatedGame = payload.new;
          setBoard(JSON.parse(updatedGame.board));
          setCurrentTurn(updatedGame.current_turn);
          if (updatedGame.winner) {
            setWinner(updatedGame.winner);
          }
          if (updatedGame.is_tie) {
            setIsTie(true);
          }
        }
      )
      .subscribe();

    return () => {
      gameChannel.unsubscribe();
    };
  }, [gameId]);

  // A helper function to check for a win locally based on the board
  const checkWinner = useCallback((currentBoard) => {
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return currentBoard[a]; // Returns "X" or "O"
      }
    }
    return null;
  }, []);

  // Handle a player clicking on a square
  const handleSquareClick = async (index) => {
    if (board[index] || winner || isTie) return;
    if (
      (currentTurn === "player_1" && playerRole !== "player_1") ||
      (currentTurn === "player_2" && playerRole !== "player_2")
    ) {
      return;
    }

    const newBoard = [...board];
    newBoard[index] = mySymbol;

    const localWinner = checkWinner(newBoard);
    let updatedWinner = null;
    let updatedIsTie = false;
    let updatedStatus = "active";

    if (localWinner) {
      updatedWinner = playerRole;
      updatedStatus = "completed";
    } else if (newBoard.every((cell) => cell !== null)) {
      updatedIsTie = true;
      updatedStatus = "completed";
    }

    const nextTurn = playerRole === "player_1" ? "player_2" : "player_1";

    const { error } = await supabase
      .from("games")
      .update({
        board: JSON.stringify(newBoard),
        current_turn: nextTurn,
        winner: updatedWinner,
        is_tie: updatedIsTie,
        status: updatedStatus,
      })
      .eq("id", gameId);

    if (error) {
      console.error("Error updating move:", error);
    }
  };

  // Handle navigation back to the home screen with GSAP animation
  const handleBackToHome = () => {
    gsap.to(".home-screen-container", {
      y: "100%",
      opacity: 0,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () =>
        navigate("/home", { state: { fromScreen: "GameScreen" } }),
    });
  };

  // GSAP animation on component mount
  useEffect(() => {
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <button className="quit-button" onClick={handleBackToHome}>
          Quit
        </button>
        <h1>Multiplayer Match</h1>
        <div className="game-wrapper">
          {/* Left: Display current user info */}
          <div className="player-info">
            <h3>{username}</h3>
            <p>
              Symbol:{" "}
              <span className={mySymbol === "X" ? "x-symbol" : "o-symbol"}>
                {mySymbol}
              </span>
            </p>
          </div>
          {/* Center: Game board */}
          <div className="game-board-wrapper">
            <div className="game-board">
              {board.map((square, index) => (
                <div
                  key={index}
                  className={`square ${
                    square === "X"
                      ? "x-symbol"
                      : square === "O"
                      ? "o-symbol"
                      : ""
                  }`}
                  onClick={() => handleSquareClick(index)}
                >
                  {square}
                </div>
              ))}
            </div>
          </div>
          {/* Right: Display opponent info */}
          <div className="player-info">
            <h3>{opponentName}</h3>
            <p>
              Symbol:{" "}
              <span className={opponentSymbol === "X" ? "x-symbol" : "o-symbol"}>
                {opponentSymbol}
              </span>
            </p>
          </div>
        </div>
      </div>
      {(winner || isTie) && (
        <div className="winner-popup-overlay">
          <div className="winner-popup-content">
            <h2>
              {winner
                ? winner === playerRole
                  ? "You Win!"
                  : "You Lost!"
                : "It's a Tie!"}
            </h2>
            <div className="winner-popup-buttons">
              <button className="play-again-button" onClick={handleBackToHome}>
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Render the coin flip overlay when needed */}
      {showCoinFlip && <CoinFlip onFlipComplete={handleCoinFlipComplete} />}
    </div>
  );
};

export default GameScreen;
