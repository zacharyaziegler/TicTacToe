import { useState, useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./LoginScreen.css";

const LoginScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // State to hold the error message

  /****** LOGIC ******/

  const handleLogin = async (event) => {
    event.preventDefault(); // Prevent page reload
    setErrorMessage(""); // Reset error message before attempting login

    try {
      // Attempt to sign in the user
      const { data: session, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      console.log("User signed in:", session);
      navigate("/home"); // Redirect to the HomeScreen after successful login
    } catch (error) {
      console.error("Login error:", error.message);
      setErrorMessage("Invalid email or password. Please try again.");
    }
  };

  /****** ANIMATION ******/
  useEffect(() => {
    // GSAP animation for the login page entering
    gsap.fromTo(
      ".login-screen-container",
      { x: "100%", opacity: 0 },
      { x: "0%", opacity: 1, duration: 1.0, ease: "power2.out" }
    );
  }, []);

  const handleBack = () => {
    // Animate the current screen out to the right
    gsap.to(".login-screen-container", {
      x: "100%",
      opacity: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => {
        navigate("/"); // Navigate back to MainScreen
      },
    });
  };

  return (
    <div className="outer-container">
      <div className="login-screen-container">
        <button className="back-button" onClick={handleBack}>
          &#8592; Back
        </button>
        <h1 className="login-title">Log In</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <label className="login-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)} // Controlled input
            required
          />
          <label className="login-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // Controlled input
            required
          />
          <button type="submit" className="login-button-login">
            Log In
          </button>
        </form>

        {/* Display error message if login fails */}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default LoginScreen;
