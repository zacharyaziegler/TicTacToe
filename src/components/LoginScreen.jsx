import { useEffect } from "react";
import { gsap } from "gsap";
import "./LoginScreen.css";

const LoginScreen = () => {
  useEffect(() => {
    // GSAP animation for the login page entering
    gsap.fromTo(
      ".login-screen-container",
      { x: "100%", opacity: 0 },
      { x: "0%", opacity: 1, duration: 1.0, ease: "power2.out" }
    );
  }, []);

  return (
    <div className="login-screen-container">
      <h1 className="login-title">Log In</h1>
      <form className="login-form">
        <label className="login-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          className="login-input"
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
          required
        />
        <button type="submit" className="login-button-login">
          Log In
        </button>
      </form>
    </div>
  );
};

export default LoginScreen;