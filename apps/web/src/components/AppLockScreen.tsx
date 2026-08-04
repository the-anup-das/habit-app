import { useState } from "react";

export function AppLockScreen({ onUnlock }: { onUnlock: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handlePress = async (digit: string) => {
    if (error) setError(false);
    
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      const success = await onUnlock(newPin);
      if (!success) {
        setError(true);
        setPin("");
      }
    }
  };

  const handleBackspace = () => {
    if (error) setError(false);
    setPin(pin.slice(0, -1));
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "var(--color-background)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <h1 style={{ fontSize: "var(--font-size-2xl)", marginBottom: "2rem", color: "var(--color-ink-1)" }}>
        App Locked
      </h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "3rem" }}>
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i}
            style={{
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "50%",
              backgroundColor: pin.length > i ? "var(--color-primary)" : "var(--color-surface-2)",
              transition: "background-color 0.2s ease"
            }}
          />
        ))}
      </div>

      {error && <p style={{ color: "#ef4444", marginTop: "-2rem", marginBottom: "2rem" }}>Incorrect PIN</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            onClick={() => handlePress(d.toString())}
            className="glass-panel"
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              fontSize: "1.5rem",
              fontWeight: "500",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-1)"
            }}
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress("0")}
          className="glass-panel"
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            fontSize: "1.5rem",
            fontWeight: "500",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-1)"
          }}
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="glass-panel"
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            fontSize: "1.2rem",
            fontWeight: "500",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
