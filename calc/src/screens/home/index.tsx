import { createRef, useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Draggable from "react-draggable";
import { Equal, Eraser } from "lucide-react";
interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface Result {
  expr: string;
  answer: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<Result>();
  const [latexExpr, setLatexExpr] = useState<Array<string>>([]);
  const [latexposition, setLatexPosition] = useState({ x: 0, y: 0 });
  const [dictOfVars, setDictOfVars] = useState({});
  const dragRefs = useMemo(
    () =>
      Array(latexExpr.length)
        .fill(0)
        .map(() => createRef<HTMLDivElement>()),
    [latexExpr.length]
  );

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setReset(false);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    if (latexExpr.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpr]);

  useEffect(() => {
    if (result) {
      const latexString = `\\(\\LARGE{${result.expr} = ${result.answer}}\\)`;
      setLatexExpr([...latexExpr, latexString]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [result]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.style.background = "black";
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const sendData = async () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const request = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/solve`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });
      const response = await request.data;
      response.data.forEach((res: Response) => {
        if (res.assign === true) {
          setDictOfVars({ ...dictOfVars, [res.expr]: res.result });
        }
      });
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (imageData.data[i + 3] > 0) {
            // If pixel is not transparent
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setLatexPosition({ x: centerX, y: centerY });
      response.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expr: data.expr,
            answer: data.result,
          });
        }, 1000);
      });
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setReset(true);
      }
      setLatexExpr([]);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.style.background = "black";
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
        ctx.strokeStyle = "white";
      }
    }
  };
  return (
    <div className="relative h-screen w-screen">
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full bg-black"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />

      {latexExpr.map((latex, index) => (
        <Draggable
          key={index}
          defaultPosition={latexposition}
          nodeRef={dragRefs[index]}
          onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
        >
          <div
            ref={dragRefs[index]}
            className="absolute p-2 text-white rounded shadow-md"
          >
            <div className="latex-content">{latex}</div>
          </div>
        </Draggable>
      ))}

      <div className="absolute bottom-6 right-6 flex flex-col gap-4">
        <Button
          onClick={sendData}
          className="rounded-full w-16 h-16 bg-orange-500 hover:bg-orange-600"
          size="icon"
        >
          <Equal className="h-8 w-8" />
          <span className="sr-only">Solve</span>
        </Button>
        <Button
          onClick={() => setReset(true)}
          className="rounded-full w-16 h-16 bg-orange-500 hover:bg-orange-600"
          size="icon"
        >
          <Eraser className="h-8 w-8" />
          <span className="sr-only">Clear</span>
        </Button>
      </div>
    </div>
  );
}

//   return (
//     <>
//       <div className="grid grid-cols-3 gap-2">
//         <Button
//           onClick={() => setReset(true)}
//           className="z-20 bg-black text-white"
//           variant="default"
//           color="black"
//         >
//           Reset
//         </Button>
//         <Button
//           onClick={() => sendData()}
//           className="z-20 bg-black text-white"
//           variant="default"
//           color="white"
//         >
//           Run
//         </Button>
//       </div>
//       <canvas
//         ref={canvasRef}
//         id="canvas"
//         className="absolute top-0 left-0 w-full h-full"
//         onMouseDown={startDrawing}
//         onMouseMove={draw}
//         onMouseUp={stopDrawing}
//         onMouseOut={stopDrawing}
//       />

//       {latexExpr &&
//         latexExpr.map((latex, index) => (
//           <Draggable
//             key={index}
//             defaultPosition={latexposition}
//             nodeRef={dragRefs[index]}
//             onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
//           >
//             <div
//               ref={dragRefs[index]}
//               className="absolute p-2 text-white rounded shadow-md"
//             >
//               <div className="latex-content">{latex}</div>
//             </div>
//           </Draggable>
//         ))}
//     </>
//   );
// }
