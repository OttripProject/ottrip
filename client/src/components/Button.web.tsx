import type { ButtonHTMLAttributes } from "react";

export default function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button style={style} {...props} />;
}

const style: React.CSSProperties = {
  backgroundColor: "#3478f6",
  color: "#fff",
  padding: "12px 20px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
