import { useEffect } from "react";
import { gsap } from "gsap";
import PropTypes from "prop-types";
import "./CoinFlip.css";

const CoinFlip = ({ onFlipComplete }) => {
  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        // When the animation completes, call the callback
        onFlipComplete();
      },
    });
    tl.to(".coin", { rotationY: 360 * 3, duration: 2, ease: "power2.out" });
  }, [onFlipComplete]);

  return (
    <div className="coin-flip-overlay">
      <div className="coin">
        <span>?</span>
      </div>
    </div>
  );
};

CoinFlip.propTypes = {
  onFlipComplete: PropTypes.func.isRequired,
};

export default CoinFlip;
