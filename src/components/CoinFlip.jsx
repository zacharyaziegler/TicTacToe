import { useEffect } from "react";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import "./CoinFlip.css";

const CoinFlip = ({ onFlipComplete, finalSide }) => {
  useEffect(() => {
    // Determine final rotation angle: if finalSide is "front", end at 0 mod 360; if "back", end at 180 mod 360.
    const finalRotation = finalSide === "front" ? 360 * 3 : 360 * 3 + 180;
    const tl = gsap.timeline({
      onComplete: () => {
        onFlipComplete();
      },
    });
    tl.to(".coin", { rotationX: finalRotation, duration: 2, ease: "power2.out" });
  }, [onFlipComplete, finalSide]);

  return (
    <div className="coin-flip-overlay">
      <div className="coin">
        <div className="coin-face front">X</div>
        <div className="coin-face back">O</div>
      </div>
    </div>
  );
};

CoinFlip.propTypes = {
  onFlipComplete: PropTypes.func.isRequired,
  finalSide: PropTypes.oneOf(["front", "back"]).isRequired,
};

export default CoinFlip;
