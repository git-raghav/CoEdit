import "./Loader.css"; // Import the CSS file for styling

const Loader = () => {
  return (
    <div className="loader JS_on">
      <span className="binary"></span>
      <span className="binary"></span>
      <span className="getting-there">Initializing workspace...</span>
    </div>
  );
};

export default Loader;
