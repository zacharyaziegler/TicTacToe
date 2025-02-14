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
  const [forfeitProcessed, setForfeitProcessed] = useState(false);

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
  
          // Only trigger the forfeit once
          if (
            updatedGame.forfeited_by &&
            updatedGame.status === "completed" &&
            !forfeitedByOpponent
          ) {
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
  }, [gameId, forfeitedByOpponent]);
  

 // Presence channel: listen for opponent presence changes and set forfeiture if necessary.
 useEffect(() => {
  if (!userId || !gameId || !gameData) return;

  const presenceChannel = supabase.channel(`game-${gameId}`, {
    config: {
      presence: { key: userId }, // Identify this user
    },
  });

  let forfeitTimeout = null; // Store timeout

  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      console.log("Presence state updated:", state);
      const opponentId = gameData.player_1 === userId ? gameData.player_2 : gameData.player_1;
      if (!opponentId) return;

      if (!state[opponentId] && !forfeitedByOpponent) {
        console.log("Opponent missing from presence. Checking again in 5s...");
        if (forfeitTimeout) clearTimeout(forfeitTimeout);
        forfeitTimeout = setTimeout(() => {
          const updatedState = presenceChannel.presenceState();
          if (!updatedState[opponentId] && !forfeitedByOpponent) {
            console.log("Opponent still missing after 5s. Marking as forfeited.");
            setForfeitedByOpponent(true);
          } else {
            console.log("Opponent reappeared. No forfeit triggered.");
          }
        }, 5000); // 5 seconds delay
      } else {
        console.log("Opponent is present.");
        clearTimeout(forfeitTimeout);
      }
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      console.log(`User ${key} left the game.`);
      if (key !== userId) { // Only react if opponent left
        if (forfeitTimeout) clearTimeout(forfeitTimeout);
        forfeitTimeout = setTimeout(() => {
          const updatedState = presenceChannel.presenceState();
          if (!updatedState[key] && !forfeitedByOpponent) {
            console.log("Opponent has not rejoined after 5s. Marking forfeit.");
            setForfeitedByOpponent(true);
          } else {
            console.log("Opponent rejoined. No forfeit triggered.");
          }
        }, 5000); // 5-second delay for both players
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ userId });
        console.log("Presence tracking started for", userId);
      }
    });

  return () => {
    clearTimeout(forfeitTimeout);
    presenceChannel.unsubscribe();
  };
}, [userId, gameId, gameData, forfeitedByOpponent]);


  
useEffect(() => {
  if (!forfeitedByOpponent || !gameId || gameData?.status === "completed" || forfeitProcessed) return;
  
  console.log("Opponent forfeited. Updating database...");

  const updateForfeit = async () => {
    if (gameData.status === "completed") return;
    
    const opponentId = gameData.player_1 === userId ? gameData.player_2 : gameData.player_1;
    
    const { error } = await supabase
      .from("games")
      .update({
        forfeited_by: opponentId, // mark the opponent as having forfeited
        status: "completed",
      })
      .eq("id", gameId);
    
    if (error) {
      console.error("Error updating game forfeit:", error);
    } else {
      console.log("Game forfeited due to opponent disconnection.");
      setForfeitProcessed(true);
    }
  };

  updateForfeit();
}, [forfeitedByOpponent, gameId, gameData, userId, forfeitProcessed]);

  

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
    if (!gameData || !userId || gameData.status === "completed" || forfeitProcessed || gameData.forfeited_by) return;
  
    console.log("Forfeiting game...");
  
    // Ensure only one forfeit update is made
    if (gameData.forfeited_by) {
      console.log("Game already forfeited. Preventing duplicate update.");
      return;
    }
  
    const { error } = await supabase
      .from("games")
      .update({
        forfeited_by: userId, // Mark the user as forfeiting
        status: "completed",
      })
      .eq("id", gameId)
      .is("forfeited_by", null); // Correct way to check if forfeit hasn't been recorded yet
  
    if (error) {
      console.error("Error forfeiting game:", error);
    } else {
      console.log("Game forfeited successfully.");
      setForfeitProcessed(true);
    }
  
    setTimeout(() => {
      handleBackToHome();
    }, 1000);
  };
  
  
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!forfeitProcessed && gameData?.status !== "completed") {
        console.log("User is closing tab. Waiting 5s before marking forfeit...");

        // Delay forfeit by 5 seconds before updating database
        setTimeout(async () => {
          if (!forfeitProcessed) {
            await handleForfeit();
          }
        }, 5000);
      }
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [gameData, userId, forfeitProcessed]);
  
  
  

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
