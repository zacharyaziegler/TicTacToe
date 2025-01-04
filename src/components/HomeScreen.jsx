import { useEffect } from "react";
import { gsap } from "gsap";
import "./HomeScreen.css";

const HomeScreen = () => {
  useEffect(() => {
    /****** ANIMATION ******/
    gsap.fromTo(
      ".home-screen-container",
      { y: "100%", opacity: 0 }, // Start position: bottom of the screen, fully transparent
      { y: "0%", opacity: 1, duration: 1.2, ease: "power2.out" } // End position: center, fully visible
    );
  }, []);

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1>Welcome to Tic-Tac-Toe!</h1>
        <p>Here you can start a game or view your profile.</p>
        <div className="button-container">
          <button className="home-button">Start New Game</button>
          <button className="home-button">View Profile</button>
          <button className="home-button">Leaderboards</button>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
