import { useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import "./MainScreen.css";

const MainScreen = () => {
    const navigate = useNavigate();

    const handleLogin = () => {
        // Animate the current screen out to the left
        gsap.to(".main-screen-container", {
            x: "-100%",
            opacity: 0,
            duration: 1.0,
            ease: "power2.inOut",
            onComplete: () => {
                navigate("/login"); // Navigate to the login page after animation
            },
        });
    };

    useEffect(() => {
        // GSAP animations for MainScreen
        gsap.fromTo(
            ".main-screen-container",
            { opacity: 0 },
            { opacity: 1, duration: 2 }
        );

        gsap.from(".main-button", {
            y: 50,
            opacity: 1,
            stagger: 0.2,
            duration: 2,
        });
    }, []);

    return (
        <div className="main-screen-container">
      <h1 className="main-title">Tic-Tac-Toe</h1>
        <div className="button-container">
          <button
            className="main-button login-button"
            onClick={handleLogin}
          >
            Log In
          </button>
          <button className="main-button signup-button">Sign Up</button>
          <button className="main-button anonymous-button">
            Continue Anonymously
          </button>
        </div>
    </div>
    );
};

export default MainScreen;