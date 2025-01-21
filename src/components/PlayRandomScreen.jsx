import { useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./PlayRandomScreen.css";

const PlayRandomScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // GSAP animation for screen appearance
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 }, // Start position
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" } // End position
    );
  }, []);

  const handleBackToHome = () => {
    // Navigate back to HomeScreen with animation
    gsap.to(".home-screen-container", {
      y: "100%",
      opacity: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => {
        navigate("/home", { state: { fromScreen: "PlayRandomScreen" } }); // Pass the originating screen
      },
    });
  };

const handleFindMatch = async () => {
  try {
    // Fetch the current user's UUID
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;

    const userId = user.id;
    console.log("Current User ID:", userId);

    // Step 1: Look for an open game
    const { data: availableGame, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("status", "waiting") // Look for games waiting for a player
      .neq("player_1", userId) // Exclude games created by the same user
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching available game:", fetchError);
      throw fetchError;
    }

    console.log("Available Game:", availableGame);

    if (availableGame) {
      // Step 2: Join the existing game
      const { error: updateError } = await supabase
        .from("games")
        .update({
          player_2: userId,
          status: "active", // Game is now active
        })
        .eq("id", availableGame.id)
        .eq("status", "waiting"); // Ensure it hasn't been updated since fetch

      if (updateError) throw updateError;

      console.log("Match found! Navigating to the game board.", availableGame);

      // Navigate to the game board
      return navigate(`/game/${availableGame.id}`, {
        state: { gameId: availableGame.id },
      });
    }

    // Step 3: Create a new game if no open game exists
    const { data: newGame, error: insertError } = await supabase
      .from("games")
      .insert([
        {
          player_1: userId, // Match creator
          player_2: null, // Explicitly set to null
          board: Array(9).fill(null), // Empty game board
          current_turn: "player_1", // Player 1 starts by default
          status: "waiting", // Waiting for an opponent
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("Game created. Waiting for a match...", newGame);

    // Step 4: Wait for another player to join
    const channel = supabase
      .channel(`game-updates:${newGame.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${newGame.id}`,
        },
        (payload) => {
          if (payload.new.status === "active") {
            console.log("Match found! Navigating to the game board.", payload.new);
            channel.unsubscribe(); // Stop listening
            navigate(`/game/${newGame.id}`, {
              state: { gameId: newGame.id },
            });
          }
        }
      )
      .subscribe();
  } catch (error) {
    console.error("Error finding or creating a match:", error.message);
    alert("Error finding a match. Please try again.");
  }
};
  

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1>Play a Random</h1>
        <p>Players online: 0</p>
        <button className="quit-button" onClick={handleBackToHome}>
          Quit
        </button>
        <button
          className="home-button find-match-button"
          onClick={handleFindMatch}
        >
          Find Match
        </button>
      </div>
    </div>
  );
};

export default PlayRandomScreen;
