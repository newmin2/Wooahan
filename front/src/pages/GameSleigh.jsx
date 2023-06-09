import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Model from "components/gameSleigh/Model";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import * as THREE from "three";
import forestMap from "assets/images/background_game_forest.webp";
import QuizCard from "components/gameSleigh/QuizCard";
import LoadingProgress from "components/gameSleigh/LoadingProgress";
import QuizResult from "components/gameSleigh/QuizResult";
import { Navigate, useNavigate } from "react-router-dom";
import { getQuizData, sleighActions } from "store/features/sliegh/sleighSlice";
import Intro from "components/gameSleigh/Intro";
import QuizWord from "components/gameSleigh/QuizWord";
import LoadingComponent from "components/common/LoadingComponent";
import bgm1 from "assets/sounds/sleighbgm_1.mp3";
import bgm2 from "assets/sounds/sleighbgm_2.mp3";
import bgm3 from "assets/sounds/sleighbgm_3.mp3";
import { Howl } from "howler";
import CommonOverlay from "components/common/CommonOverlay";
import { commonActions } from "store/features/common/commonSlice";
import WarningComponent from "components/common/WarningComponent";

const GameSleigh = () => {
  const dispatch = useDispatch();
  const navigation = useNavigate();

  // 게임 진행 관련 State
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true); // 로딩

  const [isStart, setIsStart] = useState(false); // 게임 시작
  const [isEnd, setIsEnd] = useState(false); // 게임 종료
  const [quizStatus, setQuizStatus] = useState("idle"); // 퀴즈 상태 idle(대기) start(퀴즈내려옴) stop(퀴즈맞추기) check(정답확인)
  const [quizCount, setQuizCount] = useState(0);
  const [quizResult, setQuizResult] = useState("left"); // left right
  const warning = useSelector((state) => state.common.warning);

  const bgm = useRef();

  const [imageLoadState, setImageLoadState] = useState({
    left: false,
    right: false,
  });

  const quizData = useSelector((state) => state.sleigh.quizData);

  const quizlevel = useSelector((state) => state.level.level);

  useEffect(() => {
    dispatch(getQuizData(quizlevel));
  }, []);

  const [random, setRandom] = useState([
    Math.random(),
    Math.random(),
    Math.random(),
    Math.random(),
    Math.random(),
  ]);

  // 게임 배경 Texture 로딩 및 색상 인코딩
  const texture = new THREE.TextureLoader().load(forestMap);
  texture.encoding = THREE.sRGBEncoding;

  // 캐릭터 Ref
  const modelRef = useRef();

  // 캐릭터 애니메이션
  const [modelAnimations, setModelAnimations] = useState(null);

  const doMove = useCallback(
    (value) => {
      const { actions, mixer, names } = modelAnimations;

      modelRef.current.isMove = value;
      actions[names[5]].fadeOut(0.2).stop();
      mixer.timeScale = 5;
      modelRef.current.scale.y = 1.055;
      modelRef.current.rotation.y = (Math.PI / 2) * value;
      actions[names[7]].play();
    },
    [modelAnimations]
  );

  const stopMove = useCallback(() => {
    const { actions, mixer, names } = modelAnimations;

    modelRef.current.isMove = 0;
    actions[names[7]].fadeOut(0.5).stop();
    modelRef.current.rotation.y = 0;
    mixer.timeScale = 1.5;
    modelRef.current.scale.y = 1;
    actions[names[5]].play();
  }, [modelAnimations]);

  useEffect(() => {
    if (modelAnimations) {
      setIsLoading(false);
      modelRef.current.rotation.x = -0.1;
      modelAnimations.actions[modelAnimations.names[5]].play();
    }
  }, [modelAnimations]);

  // 게임 시작 시
  useEffect(() => {
    if (!modelAnimations || !isStart) return;

    const { actions, mixer, names } = modelAnimations;

    actions[names[5]].stop();
    modelRef.current.rotation.y = Math.PI;
    actions[names[6]].play();
    actions[names[7]].play();
    mixer.timeScale = 4;
    setTimeout(() => {
      setQuizStatus("stop");
    }, 2000);

    return () => {
      names.forEach((element) => {
        actions[element].reset().fadeOut(0.5).stop();
      });
    };
  }, [isStart]);

  useEffect(() => {
    if (quizStatus === "idle") return;

    const { actions, mixer, names } = modelAnimations;

    const stopActions = () => {
      names.forEach((element) => {
        actions[element].stop();
      });
    };

    // 다음 문제
    if (quizStatus === "nextQuiz") {
      setImageLoadState({ left: false, right: false });
      bgm.current.fade(0.01, 1, 800);
      stopActions();
      if (quizCount < 5) {
        modelRef.current.rotation.y = Math.PI;
        mixer.timeScale = 4;
        actions[names[6]].play();
        actions[names[7]].play();

        setTimeout(() => {
          setQuizStatus("stop");
        }, 2000); // onload라 시간줄임
      } else {
        // 퀴즈 전부 종료
        modelRef.current.rotation.x = -0.2;
        mixer.timeScale = 3;
        actions[names[4]].play();
        actions[names[6]].play();

        setTimeout(() => {
          setQuizStatus("idle");
          setQuizCount(0);
          setIsEnd(true);
        }, 3000);
      }
    }

    // 정답 확인
    if (quizStatus === "check") {
      stopActions();
      stopMove();
      modelRef.current.position.x = 0;
      mixer.timeScale = 1.5;
      actions[names[4]].play();
      actions[names[5]].play();
      bgm.current.fade(1, 0.01, 300);
    }

    // return () => {};
  }, [quizStatus]);

  useEffect(() => {
    if (isEnd)
      navigation("/ending", {
        state: {
          game: "sleigh",
          character: "fox",
          mention: "심부름 다녀왔습니다!",
        },
      });
  }, [isEnd]);

  useEffect(() => {
    if (
      imageLoadState.left &&
      imageLoadState.right &&
      quizStatus === "stop" &&
      quizCount < 5
    ) {
      const { actions, mixer, names } = modelAnimations;

      names.forEach((element) => {
        actions[element].stop();
      });

      modelRef.current.rotation.y = 0;
      mixer.timeScale = 1.5;
      actions[names[5]].play();

      addMoveEvent();
    }

    return () => {
      removeMoveEvent();
    };
  }, [imageLoadState, quizStatus]);

  const addMoveEvent = () => {
    window.doMove = (value) => {
      doMove(value);
    };
    window.stopMove = stopMove;
  };

  const removeMoveEvent = () => {
    window.doMove = () => {
      return null;
    };
    window.stopMove = () => {
      return null;
    };
  };

  // 게임 입장 시 중력센서 사용
  useEffect(() => {
    if (!isStart) return;

    removeMoveEvent();

    if (window.sleigh) {
      window.sleigh.resumeSensor();
    }

    return () => {
      if (window.sleigh) {
        window.sleigh.pauseSensor();
      }
    };
  }, [isStart]);

  // 카메라 설정
  const camera = {
    fov: 80,
    aspect: window.innerWidth / window.innerHeight / 2,
    position: [0, 0, 3],
  };

  const quizScale = (window.innerWidth / window.innerHeight) * 1.25;

  useEffect(() => {
    let loadingTimer;
    if (isLoading) {
      loadingTimer = setTimeout(() => {
        navigation("/");
      }, 30000);
    }

    return () => {
      clearTimeout(loadingTimer);
    };
  }, [isLoading]);

  useEffect(() => {
    const bgmList = [bgm1, bgm2, bgm3];

    const sound = new Howl({
      src: bgmList[parseInt(Math.random() * 2.99)],
      autoplay: true,
      loop: true,
      volume: 1,
      preload: true,
    });

    bgm.current = sound;

    return () => {
      sound.unload();
    };
  }, []);

  return (
    <>
      <div className="w-screen h-screen">
        {quizStatus !== "idle" &&
          quizStatus !== "start" &&
          quizStatus !== "check" &&
          quizStatus !== "nextQuiz" &&
          quizCount < 5 && (
            <div className="absolute flex items-center justify-center w-screen h-screen">
              <div
                className={`${
                  imageLoadState.left && imageLoadState.right
                    ? "animate-scale-up-center"
                    : "hidden"
                } z-50 absolute w-[25vw] h-[25vw] left-[6.5vw] max-w-[60vh] max-h-[60vh]`}
                style={{
                  top: `${30 / (quizScale / 1.25)}vh`,
                }}
              >
                <div className="w-full h-full rounded-[20px] animate-card-bounce border-2 bg-white">
                  <img
                    className="w-full h-full rounded-[16px]"
                    alt="#"
                    src={
                      random[quizCount] > 0.5
                        ? quizData[quizCount].words[0].word.imgUrl
                        : quizData[quizCount].words[1].word.imgUrl
                    }
                    onLoad={() => {
                      setImageLoadState((state) => {
                        return { left: true, right: state.right };
                      });
                    }}
                  />
                </div>
              </div>
              <div
                className={`${
                  imageLoadState.left && imageLoadState.right
                    ? "animate-scale-up-center"
                    : "hidden"
                } z-50 absolute w-[25vw] h-[25vw] right-[6.5vw] max-w-[60vh] max-h-[60vh]`}
                style={{
                  top: `${30 / (quizScale / 1.25)}vh`,
                }}
              >
                <div className="w-full h-full rounded-[20px] animate-card-bounce border-2 bg-white">
                  <img
                    className="w-full h-full rounded-[16px]"
                    alt="#"
                    src={
                      random[quizCount] > 0.5
                        ? quizData[quizCount].words[1].word.imgUrl
                        : quizData[quizCount].words[0].word.imgUrl
                    }
                    onLoad={() => {
                      setImageLoadState((state) => {
                        return { left: state.left, right: true };
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        <Canvas
          onCreated={() => {
            setIsCanvasLoading(false);
          }}
          flat={true}
        >
          <PerspectiveCamera {...camera} makeDefault />
          <ambientLight />
          <Environment background={true} map={texture} />
          {!isCanvasLoading && (
            <>
              <Suspense fallback={null}>
                <Model
                  modelRef={modelRef}
                  quizScale={quizScale}
                  quizStatus={quizStatus}
                  setQuizResult={setQuizResult}
                  setQuizStatus={setQuizStatus}
                  setModelAnimations={setModelAnimations}
                />
              </Suspense>
              {isLoading && <LoadingProgress setIsLoading={setIsLoading} />}
            </>
          )}
        </Canvas>
        {!isCanvasLoading && !isLoading && !isStart && (
          <Intro setIsStart={setIsStart} />
        )}
        {quizStatus === "stop" &&
          quizCount < 5 &&
          imageLoadState.left &&
          imageLoadState.right && (
            <div className="absolute bottom-[7vh] w-screen flex justify-between px-[10vw]">
              <button
                type="button"
                onTouchStart={(e) => {
                  removeMoveEvent();
                  doMove(-1);
                }}
                onMouseDown={() => {
                  doMove(-1);
                }}
                onTouchEnd={(e) => {
                  addMoveEvent();
                  stopMove();
                }}
                onMouseUp={stopMove}
                className="bg-mainBlack opacity-80 rounded-[100%] text-[min(4vw,10vh)] text-white w-[8vw] h-[8vw] z-20 max-w-[20vh] max-h-[20vh]"
              >
                <p className="translate-x-[-0.2vw]">◀</p>
              </button>
              <button
                type="button"
                onTouchStart={(e) => {
                  removeMoveEvent();
                  doMove(1);
                }}
                onMouseDown={() => {
                  doMove(1);
                }}
                onTouchEnd={(e) => {
                  addMoveEvent();
                  stopMove();
                }}
                onMouseUp={stopMove}
                className="bg-mainBlack opacity-80 rounded-[100%] text-[min(4vw,10vh)] text-white w-[8vw] h-[8vw] z-20 translate-x-[2%] max-w-[20vh] max-h-[20vh]"
              >
                <p className="translate-x-[0.2vw]">▶</p>
              </button>
            </div>
          )}
        {quizStatus === "stop" &&
          quizCount < 5 &&
          imageLoadState.left &&
          imageLoadState.right && <QuizWord word={quizData[quizCount].quiz} />}
        {(isCanvasLoading || isLoading) && <LoadingComponent />}
        {quizStatus === "check" && (
          <QuizResult
            setQuizStatus={setQuizStatus}
            setQuizCount={setQuizCount}
            result={
              quizResult === "left"
                ? quizData[quizCount].words[random[quizCount] > 0.5 ? 0 : 1]
                : quizData[quizCount].words[random[quizCount] > 0.5 ? 1 : 0]
            }
          />
        )}
        {isCanvasLoading && "게임정보를 불러오고 있습니다"}
      </div>
      <div>
        <div
          onClick={() => {
            dispatch(commonActions.setWarning());
          }}
          className={`absolute ${
            quizScale / 1.25 > 1
              ? "h-[7vh] w-[7vh] right-[3vh] top-[3vh] text-[5vh]"
              : "h-[7vw] w-[7vw] right-[3vw] top-[3vw] text-[5vw]"
          } rounded-lg bg-white bg-opacity-40 font-MaplestoryLight z-[56]`}
        >
          <p>X</p>
        </div>
      </div>
      {warning && <WarningComponent />}
    </>
  );
};

export default GameSleigh;
