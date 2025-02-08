import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import CoinFlip from "./CoinFlip"; // Updated below
import "./GameScreen.css";

// Define the winning combinations for tic tac toe
const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const GameScreen = () => {
  const { gameId } = useParams(); // Get the game id from the URL
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(9).fill(null)); // Game board
  const [currentTurn, setCurrentTurn] = useState(null); // "player_1" or "player_2"
  const [winner, setWinner] = useState(null); // Winner ("player_1" or "player_2")
  const [isTie, setIsTie] = useState(false); // Tie flag
  const [showCoinFlip, setShowCoinFlip] = useState(false);

  const [gameData, setGameData] = useState(null);

  // Final coin side for this user ("front" or "back")
  const [finalSide, setFinalSide] = useState("");

  // Local symbols for the current user and opponent
  const [mySymbol, setMySymbol] = useState("");
  const [opponentSymbol, setOpponentSymbol] = useState("");

  // The role of the current user ("player_1" or "player_2")
  const [playerRole, setPlayerRole] = useState("");

  // Usernames (fetched from profiles)
  const [username, setUsername] = useState("Loading...");
  const [opponentName, setOpponentName] = useState("Loading...");

  const [userId, setUserId] = useState(null);
  const [forfeitedByOpponent, setForfeitedByOpponent] = useState(false);

  // Helper function to re-fetch the game record from Supabase
  const reFetchGameRecord = async () => {
    const { data: updatedGame, error: refetchError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();
    if (refetchError) {
      console.error("Error re-fetching game:", refetchError);
      return;
    }
    setGameData(updatedGame);
    setBoard(JSON.parse(updatedGame.board));
    setCurrentTurn(updatedGame.current_turn);
    // Update local symbol state using the trigger-assigned values
    if (userId === updatedGame.symbol_x) {
      setMySymbol("X");
      setOpponentSymbol("O");
      setFinalSide("front"); // front face shows X
    } else if (userId === updatedGame.symbol_o) {
      setMySymbol("O");
      setOpponentSymbol("X");
      setFinalSide("back"); // back face shows O
    }
  };

  // On mount: fetch current user and game record from Supabase
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        // 1. Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
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

        // 4. Handle symbol assignment using trigger-assigned values.
        // The trigger on your games table now sets symbol_x and symbol_o when a game is inserted.
        if (game.symbol_x && game.symbol_o) {
          // Instead of immediately setting the symbols, force the coin flip overlay
          // to appear for a set duration before updating local state.
          // Determine final side: if user is assigned "X", coin lands with front face; if "O", then back.
          const userFinalSide = user.id === game.symbol_x ? "front" : "back";
          setFinalSide(userFinalSide);
          setShowCoinFlip(true);
          // Delay re-fetching the record so that the coin flip animation plays.
          setTimeout(async () => {
            await reFetchGameRecord();
            setShowCoinFlip(false);
          }, 2000); // 2000ms delay for the coin flip animation
        } else {
          // If symbols are not yet set, also show the coin flip overlay.
          setShowCoinFlip(true);
        }

        // 5. Fetch the current user's profile (username)
        const { data: userProfile, error: userProfileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (userProfileError) {
          console.error(
            "Error fetching current user's profile:",
            userProfileError
          );
        } else {
          setUsername(userProfile.username);
        }

        // 6. Determine the opponent's id based on player role
        const opponentId =
          game.player_1 === user.id ? game.player_2 : game.player_1;
        // 7. Fetch the opponent's profile (username)
        const { data: opponentProfile, error: opponentProfileError } =
          await supabase
            .from("profiles")
            .select("username")
            .eq("id", opponentId)
            .single();
        if (opponentProfileError) {
          console.error(
            "Error fetching opponent's profile:",
            opponentProfileError
          );
        } else {
          setOpponentName(opponentProfile.username);
        }
      } catch (err) {
        console.error("Error in fetchGameData:", err);
      }
    };

    fetchGameData();
  }, [gameId]);

  

  // Callback to handle coin flip animation completion (visual effect only).
  // Once the animation is complete, re-fetch the game record so that local state reflects the trigger-assigned values.
  const handleCoinFlipComplete = async () => {
    await reFetchGameRecord();
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
        async (payload) => {
          const updatedGame = payload.new;
          setBoard(JSON.parse(updatedGame.board));
          setCurrentTurn(updatedGame.current_turn);
  
          if (updatedGame.winner) {
            setWinner(updatedGame.winner);
          }
          if (updatedGame.is_tie) {
            setIsTie(true);
          }
  
          // ✅ Ensure forfeit is processed before rendering popup
          if (updatedGame.forfeited_by && updatedGame.status === "completed") {
            const {
              data: { user },
            } = await supabase.auth.getUser();
  
            if (user?.id !== updatedGame.forfeited_by) {
              console.log("Opponent has forfeited. Showing custom popup...");
              setForfeitedByOpponent(true);
            }
          }
        }
      )
      .subscribe();
  
    return () => {
      gameChannel.unsubscribe();
    };
  }, [gameId]);
  

  // Helper function to check for a win locally based on the board
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
      console.warn("Not your turn!");
      return;
    }

    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);

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

    console.log("Updating game with ID:", gameId);
    console.log(
      "Setting current_turn to:",
      updatedWinner ? "None (game over)" : nextTurn
    );

    const { error } = await supabase
      .from("games")
      .update({
        board: JSON.stringify(newBoard),
        current_turn: updatedWinner ? null : nextTurn,
        winner: updatedWinner,
        is_tie: updatedIsTie,
        status: updatedStatus,
      })
      .eq("id", gameId);

    if (error) {
      console.error("Error updating move in Supabase:", error);
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

  useEffect(() => {
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  const handleForfeit = async () => {
    if (!gameData || !userId) return;
  
    console.log("Forfeiting game...");
  
    // Update the game with the forfeited_by field
    const { error } = await supabase
      .from("games")
      .update({
        forfeited_by: userId, // Mark the user as the one who forfeited
        status: "completed",
      })
      .eq("id", gameId);
  
    if (error) {
      console.error("Error forfeiting game:", error);
    } else {
      console.log("Game forfeited successfully.");
    }
  
    // ✅ Delay navigation slightly to ensure state updates
    setTimeout(() => {
      handleBackToHome();
    }, 1000);
  };
  

  // Detect if user closes tab
  useEffect(() => {
    const handleBeforeUnload = async () => {
      await handleForfeit();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gameData, userId]);

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <button className="quit-button" onClick={handleForfeit}>
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
              <span
                className={opponentSymbol === "X" ? "x-symbol" : "o-symbol"}
              >
                {opponentSymbol}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Updated Winner Popup */}
      {( forfeitedByOpponent || winner || isTie ) && (
        <div className="winner-popup-overlay">
          <div className="winner-popup-content">
            <h2>
              {forfeitedByOpponent
                ? "Your Opponent Forfeited! You Win!"
                : winner
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

      {showCoinFlip && (
        <CoinFlip
          onFlipComplete={handleCoinFlipComplete}
          finalSide={finalSide}
        />
      )}
    </div>
  );
};

export default GameScreen;
