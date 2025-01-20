import { useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="home-screen-container">
      <div className="vertical-content-box">
        <h1>Play a Random</h1>
        <p>Here, you will be matched with a random player.</p>
        <button className="quit-button" onClick={handleBackToHome}>
          Quit
        </button>
      </div>
    </div>
  );
};

export default PlayRandomScreen;