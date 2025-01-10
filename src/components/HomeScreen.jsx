import { useEffect } from "react";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./HomeScreen.css";

const HomeScreen = () => {
  
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log("User signed out successfully");
      navigate("/login"); // Redirect to LoginScreen after logging out
    } catch (error) {
      console.error("Error signing out:", error.message);
      alert("Error signing out. Please try again.");
    }
  };

    /****** ANIMATION ******/
  useEffect(() => {
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 }, // Start position: bottom of the screen, fully transparent
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" } // End position: center, fully visible
    );
  }, []);

  const handlePlayBot = () => {
    // GSAP animation: move content up and fade out
    gsap.to(".home-screen-container", {
      y: "-100%", // Move to the top
      opacity: 0, // Fade out
      duration: 1.0, // Duration of the animation
      ease: "power2.inOut",
      onComplete: () => {
        navigate("/play-bot"); // Navigate to PlayBotScreen after animation
      },
    });
  };

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1>Welcome to Tic-Tac-Toe!</h1>
        <p>Here you can start a game or view your profile.</p>
        <div className="button-container">
          <button className="home-button">Play a Random</button>
          <button className="home-button">Play a Friend</button>
          <button className="home-button" onClick={ handlePlayBot }>Play a Bot</button>
          <button className="home-button">View Profile</button>
          <button className="home-button" onClick={ handleLogout }>Log Out</button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
