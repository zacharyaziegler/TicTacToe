import { useEffect } from "react";
import { gsap } from "gsap";
import "./MainScreen.css";

const MainScreen = () => {
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
                <button className="main-button login-button">Log In</button>
                <button className="main-button signup-button">Sign Up</button>
                <button className="main-button anonymous-button"> Continue Anonymously</button>
            </div>
        </div>
    );
};

export default MainScreen;