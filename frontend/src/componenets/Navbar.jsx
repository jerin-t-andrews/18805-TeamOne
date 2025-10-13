function Navbar() {
    return (
        <nav>
            <div className="title">Hardware Project Manager</div>
                <div className="right-section">
                    <input type="text" placeholder="Username"/>
                    <input type="password" placeholder="Password"/>
                    <button>Login</button>
                </div>
        </nav>
    );
}

export default Navbar;