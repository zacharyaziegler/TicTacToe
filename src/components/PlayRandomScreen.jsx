import { useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./PlayRandomScreen.css";

const PlayRandomScreen = () => {
  const navigate = useNavigate();

  useEffect(() => { // handle removing from queue due to browser/tab closure
    const removeFromQueue = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
  
        const userId = user.id;
  
        const { error: deleteError } = await supabase
          .from("queue")
          .delete()
          .eq("user_id", userId);
  
        if (deleteError) throw deleteError;
  
        console.log("User removed from queue due to browser/tab closure.");
      } catch (error) {
        console.error("Error removing user from queue:", error.message);
      }
    };
  
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      removeFromQueue();
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => { // heartbeat to ensure user in queue is active
    const updateExpiry = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
  
        const userId = user.id;
  
        const { error: updateError } = await supabase
          .from("queue")
          .update({ expiry: new Date(new Date().getTime() + 60000) }) // 1 minute from now
          .eq("user_id", userId);
  
        if (updateError) throw updateError;
  
        console.log("Updated expiry time for user in queue.");
      } catch (error) {
        console.error("Error updating expiry:", error.message);
      }
    };
  
    const interval = setInterval(updateExpiry, 30000); // Update every 30 seconds
  
    return () => {
      clearInterval(interval); // Clear interval on unmount
    };
  }, []);

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
      // Refresh the user's session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Error refreshing session:", refreshError);
        throw refreshError;
      }
      console.log("Session refreshed:", refreshData);
  
      // Fetch the current user's UUID
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
  
      console.log("Authenticated user:", user);
      console.error("Auth error (if any):", authError);
  
      if (authError) throw authError;
  
      const userId = user.id;
      console.log("Current User ID:", userId);
  
      // Step 1: Add the user to the queue
      const { error: queueError } = await supabase
        .from("queue")
        .insert([{ user_id: userId, is_matched: false, game_id: null }]);
  
      if (queueError) throw queueError;
  
      console.log("User added to queue.");
  
      // Step 2: Continuously check for a match
      const channel = supabase
        .channel("queue-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "queue",
          },
          async (payload) => {
            if (payload.new.user_id === userId && payload.new.is_matched) {
              console.log("Match found!", payload.new);
  
              // Navigate to the game board
              channel.unsubscribe();
              navigate(`/game/${payload.new.game_id}`, {
                state: { gameId: payload.new.game_id },
              });
            }
          }
        )
        .subscribe();
  
      // Step 3: Try matching the user with another in the queue
      const { data: unmatchedUsers, error: matchError } = await supabase
        .from("queue")
        .select("*")
        .eq("is_matched", false)
        .neq("user_id", userId)
        .limit(1);
  
      if (matchError) {
        console.error("Error fetching unmatched users:", matchError);
        throw matchError;
      }
  
      console.log("Unmatched users found:", unmatchedUsers);
  
      if (unmatchedUsers && unmatchedUsers.length > 0) {
        // Match the current user with the first unmatched user
        const otherUser = unmatchedUsers[0];
        console.log("Matching with user:", otherUser.user_id);
  
        // **Debugging Logs**
        console.log("auth.uid():", userId);
        console.log("player_1:", userId);
        console.log("player_2:", otherUser.user_id);
  
        // Create a new game
        const formattedBoard = JSON.stringify(Array(9).fill(null));
        const { data: newGame, error: gameError } = await supabase
          .from("games")
          .insert([
            {
              player_1: userId,
              player_2: otherUser.user_id,
              board: formattedBoard,
              current_turn: "player_1",
              status: "active",
            },
          ])
          .select()
          .single();
  
        if (gameError) {
          console.error("Error creating a new game:", gameError);
          throw gameError;
        }
  
        console.log("Game created:", newGame);
  
        // Update the queue entries for both users
        const { error: updateError1 } = await supabase
          .from("queue")
          .update({ is_matched: true, game_id: newGame.id })
          .eq("user_id", userId);
  
        const { error: updateError2 } = await supabase
          .from("queue")
          .update({ is_matched: true, game_id: newGame.id })
          .eq("user_id", otherUser.user_id);
  
        if (updateError1 || updateError2) {
          console.error("Error updating queue entries:", {
            updateError1,
            updateError2,
          });
          throw new Error("Error updating queue entries.");
        }
  
        console.log("Users matched and queue updated.");
      } else {
        console.log("No unmatched users found. Waiting...");
      }
    } catch (error) {
      console.error("Error finding a match:", error.message);
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
