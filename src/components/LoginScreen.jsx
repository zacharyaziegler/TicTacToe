import { useEffect } from "react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";
import "./LoginScreen.css";

const LoginScreen = () => {
  const navigate = useNavigate();

  // const handleLogin = async (event) => {
  //   event.preventDefault();
  //   const email = event.target.email.value;
  //   const password = event.target.password.value;
  
  //   try {
  //     const user = await Auth.signIn(email, password);
  //     console.log("Login successful:", user);
  //     alert("Login successful!");
  //   } catch (error) {
  //     console.error("Login error:", error);
  //     alert(`Login failed: ${error.message}`);
  //   }
  // };
  

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
    </div>
  );
};

export default LoginScreen;
