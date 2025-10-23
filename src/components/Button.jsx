const Button = ({ children, onClick, variant = "yellow", className = "", type = "button" }) => {
  const map = { yellow: "btn--yellow", outline: "btn--outline", black: "btn--black" };
  return (
    <button type={type} onClick={onClick} className={`btn ${map[variant]} ${className}`}>
      {children}
    </button>
  );
};
export default Button;
