import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import CoinFlip from "./CoinFlip";
import "./GameScreen.css";

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
  const [finalSide, setFinalSide] = useState(""); // Final coin side for this user ("front" or "back")
  const [mySymbol, setMySymbol] = useState(""); // Local symbols for the current user and opponent
  const [opponentSymbol, setOpponentSymbol] = useState(""); // ^
  const [playerRole, setPlayerRole] = useState(""); // The role of the current user ("player_1" or "player_2")
  const [username, setUsername] = useState("Loading..."); // Usernames (fetched from profiles)
  const [opponentName, setOpponentName] = useState("Loading..."); // ^
  const [userId, setUserId] = useState(null); // UUID
  const [forfeitedByOpponent, setForfeitedByOpponent] = useState(false); // Did game end in forfeit
  const [currentTurnName, setCurrentTurnName] = useState("Loading..."); // Displays username of user who's turn it currently is
  const [turnTimer, setTurnTimer] = useState(30); // Timer for each turn

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
        // Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) {
          console.error("Auth error:", authError);
          return;
        }
        setUserId(user.id);

        // Fetch the game record by gameId
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

        // Determine the player's role based on the game record
        if (game.player_1 === user.id) {
          setPlayerRole("player_1");
        } else if (game.player_2 === user.id) {
          setPlayerRole("player_2");
        }

        // Handle symbol assignment using trigger-assigned values.
        if (game.symbol_x && game.symbol_o) {
          // Force the coin flip overlay to appear for a set duration before updating local state.
          // Determine final side. if user is assigned "X", coin lands with front face; if "O", then back.
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

        // Fetch the current user's profile (username)
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

        // Determine the opponent's id based on player role
        const opponentId =
          game.player_1 === user.id ? game.player_2 : game.player_1;
        // Fetch the opponent's profile (username)
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

  // Once the animation is complete, re-fetch the game record so that local state reflects the trigger-assigned values.
  const handleCoinFlipComplete = async () => {
    await reFetchGameRecord();
    setShowCoinFlip(false);

    // Call the Supabase function to set the timer
    const { error } = await supabase.rpc("set_turn_timer", {
      game_id: gameId,
      seconds: 30, // Set to 30s
    });

    if (error) {
      console.error("Error setting initial turn timer:", error);
    }
  };

  // Listen for game updates in Supabase
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
          console.log("Game update received:", payload.new);

          const updatedGame = payload.new;
          setGameData(updatedGame);

          if (updatedGame.board) {
            setBoard(JSON.parse(updatedGame.board));
          }

          setCurrentTurn(updatedGame.current_turn);

          if (updatedGame.winner) {
            console.log("Winner detected:", updatedGame.winner);
            setWinner(updatedGame.winner); // Ensure this updates
          }

          if (updatedGame.is_tie) {
            setIsTie(true);
          }

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

  // Presence channel to track user disconnect
  useEffect(() => {
    if (
      !userId ||
      !gameId ||
      !gameData ||
      gameData.status === "completed" ||
      gameData.forfeited_by
    )
      return; // Prevent double update

    const presenceChannel = supabase.channel(`game-${gameId}`, {
      config: { presence: { key: userId } },
    });

    let forfeitTimeout = null;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        console.log("Presence state updated:", state);

        const opponentId =
          gameData.player_1 === userId ? gameData.player_2 : gameData.player_1;
        if (!opponentId) return;

        if (!state[opponentId] && !forfeitedByOpponent) {
          console.log("Opponent missing. Checking again in 5s...");
          if (forfeitTimeout) clearTimeout(forfeitTimeout);
          forfeitTimeout = setTimeout(async () => {
            const updatedState = presenceChannel.presenceState();
            if (
              !updatedState[opponentId] &&
              !forfeitedByOpponent &&
              gameData.status !== "completed" &&
              !gameData.forfeited_by
            ) {
              // Only update if no forfeit
              console.log("Opponent still missing after 5s. Marking forfeit.");
              setForfeitedByOpponent(true);

              // Ensure only one update happens
              await supabase
                .from("games")
                .update({
                  forfeited_by: opponentId,
                  status: "completed",
                })
                .eq("id", gameId)
                .is("forfeited_by", null); // Prevents duplicate update
            } else {
              console.log("Opponent reappeared. No forfeit triggered.");
            }
          }, 5000);
        } else {
          console.log("Opponent is present.");
          clearTimeout(forfeitTimeout);
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

  // If opponent forfeited, set forfeited_by column in Supabase
  useEffect(() => {
    if (
      !forfeitedByOpponent ||
      !gameId ||
      gameData?.status === "completed" ||
      forfeitProcessed
    )
      return;

    console.log("Opponent forfeited. Updating database...");

    const updateForfeit = async () => {
      if (gameData.status === "completed") return;

      const opponentId =
        gameData.player_1 === userId ? gameData.player_2 : gameData.player_1;

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
    setBoard(newBoard); // Update UI immediately

    const localWinner = checkWinner(newBoard);
    let updatedWinnerId = null;
    let updatedIsTie = false;
    let updatedStatus = "active";

    if (localWinner) {
      updatedWinnerId =
        playerRole === "player_1" ? gameData.player_1 : gameData.player_2;
      updatedStatus = "completed";
    } else if (newBoard.every((cell) => cell !== null)) {
      updatedIsTie = true;
      updatedStatus = "completed";
    }

    const nextTurn = updatedWinnerId
      ? null
      : playerRole === "player_1"
      ? "player_2"
      : "player_1";

    console.log("Updating game with ID:", gameId);
    console.log(
      "Setting current_turn to:",
      nextTurn ? nextTurn : "None (game over)"
    );

    // Explicitly cast gameId as UUID in Supabase query
    const { error } = await supabase
      .from("games")
      .update({
        board: JSON.stringify(newBoard),
        current_turn: updatedWinnerId ? null : nextTurn,
        winner: updatedWinnerId, // Store winner as "player_1" or "player_2"
        is_tie: updatedIsTie,
        status: updatedStatus,
      })
      .match({ id: gameId }); // This will properly compare the UUID

    if (error) {
      console.error("Error updating move in Supabase:", error);
      return;
    }

    if (updatedWinnerId) {
      console.log("Winner detected:", updatedWinnerId);
      setWinner(updatedWinnerId); // Update UI immediately
    }

    // Reset turn timer if the game is still active
    if (!updatedWinnerId) {
      const { error: timerError } = await supabase.rpc("set_turn_timer", {
        game_id: gameId,
        seconds: 30,
      });

      if (timerError) {
        console.error("Error resetting turn timer:", timerError);
      }
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
    if (
      !gameData ||
      !userId ||
      gameData.status === "completed" ||
      forfeitProcessed ||
      gameData.forfeited_by
    ) {
      console.log(
        "Forfeit already processed or game completed. Skipping update."
      );
      return;
    }

    console.log("Forfeiting game...");

    // Ensure only the first player updates the database
    const { error, data } = await supabase
      .from("games")
      .update({
        forfeited_by: userId,
        status: "completed",
      })
      .eq("id", gameId)
      .is("forfeited_by", null); 

    if (error) {
      console.error("Error forfeiting game:", error);
    } else {
      console.log("Game forfeited successfully. Database response:", data);
      setForfeitProcessed(true);
    }

    setTimeout(() => {
      handleBackToHome();
    }, 1000);
  };

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!forfeitProcessed && gameData?.status !== "completed") {
        console.log(
          "User is closing tab. Waiting 5s before marking forfeit..."
        );

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

  const fetchCurrentTurnName = async () => {
    if (!gameData || !currentTurn) return;

    // Get the UUID of the current turn player
    const currentTurnUUID =
      currentTurn === "player_1" ? gameData.player_1 : gameData.player_2;

    if (!currentTurnUUID) return;

    // Fetch the username from profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", currentTurnUUID)
      .single();

    if (error) {
      console.error("Error fetching current turn username:", error);
      return;
    }

    setCurrentTurnName(profile.username);
  };

  useEffect(() => {
    fetchCurrentTurnName();
  }, [currentTurn, gameData]);

  useEffect(() => {
    if (!gameData) return;

    // Stop timer immediately if game is over (win, loss, tie, forfeit) prevents time expiring after winner or loser is declared
    if (gameData.status === "completed") {
      console.log("Game ended. Stopping timer.");
      setTurnTimer(0);
      return; // Exit useEffect to prevent timer updates
    }

    if (!gameData.turn_timer_expires_at) return;

    console.log(
      "Raw turn_timer_expires_at from Supabase:",
      gameData.turn_timer_expires_at
    );

    const expirationTime = new Date(gameData.turn_timer_expires_at + "Z");
    const now = new Date();

    const remainingSeconds = Math.max(
      0,
      Math.floor((expirationTime.getTime() - now.getTime()) / 1000)
    );

    console.log("Remaining Time (Seconds):", remainingSeconds);

    setTurnTimer(remainingSeconds);

    if (remainingSeconds <= 0) {
      console.log("Timer reached zero! Triggering forfeit...");
      handleForfeitDueToTimer();
    }

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(
        0,
        Math.floor((expirationTime.getTime() - now.getTime()) / 1000)
      );

      // Stop updating if game is completed
      if (gameData.status === "completed") {
        console.log("Game completed. Clearing timer.");
        clearInterval(interval);
        setTurnTimer(0);
        return;
      }

      setTurnTimer(remaining);

      if (remaining <= 0) {
        console.log("Timer expired! Calling forfeit...");
        handleForfeitDueToTimer();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData]);

  const handleForfeitDueToTimer = async () => {
    if (!gameData || gameData.status === "completed") return;

    console.log("Time expired! Handling forfeit...");

    // Call the Supabase function to handle the forfeit
    const { error } = await supabase.rpc("forfeit_turn_due_to_timer", {
      game_id: gameId,
    });

    if (error) {
      console.error("Error processing turn timeout forfeit:", error);
    } else {
      console.log("Forfeit processed successfully!");
      setForfeitProcessed(true);
    }
  };

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1 className="game-title">Multiplayer Match</h1>

        <button className="quit-button" onClick={handleForfeit}>
          Quit
        </button>

        {/* New Turn Info Section */}
        <div className="turn-info">
          <p>
            Current Turn: <strong>{currentTurnName}</strong>
          </p>
          <p>
            Time Remaining: <strong>{turnTimer}s</strong>
          </p>
        </div>

        <div className="game-wrapper">
          {/* Left: Display current user info */}
          <div className="player-info">
            <h3>{username} (You)</h3>
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

      {/* Winner Popup */}
      {(forfeitedByOpponent ||
        gameData?.winner ||
        isTie ||
        gameData?.forfeited_by) && (
        <div className="winner-popup-overlay">
          <div className="winner-popup-content">
            <h2>
              {gameData?.forfeited_by === userId
                ? "Time Expired! You Lose!"
                : gameData?.forfeited_by
                ? "Your Opponent Forfeited! You Win!"
                : winner
                ? winner === userId
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
