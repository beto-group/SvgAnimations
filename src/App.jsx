const { useEffect, useRef, useState, useMemo } = dc;

const { ICONS } = await dc.require(dc.resolvePath("SVG ANIMATIONS/src/data/icons.js"));

// =================================================================================
// THEME COLORS (DYNAMIC OBSIDIAN INTEGRATION)
// =================================================================================
const THEME = {
  bg: {
    primary: 'var(--background-primary)',
    secondary: 'var(--background-secondary)',
    tertiary: 'var(--background-secondary-alt)',
  },
  text: {
    primary: 'var(--text-normal)',
    secondary: 'var(--text-muted)',
    muted: 'var(--text-faint)',
  },
  accent: {
    purple: 'var(--interactive-accent)',
    purpleHover: 'var(--text-accent)',
    purpleDark: 'var(--background-modifier-hover)',
  },
  border: 'var(--background-modifier-border)',
  success: 'var(--text-success)',
  error: 'var(--text-error)',
};

// =================================================================================
// --- DOM TRAVERSAL UTILITIES ---
// =================================================================================
function findNearestAncestorWithClass(element, className) {
    if (!element) return null;
    let current = element.parentNode;
    while (current) {
        if (current.classList && current.classList.contains(className)) {
            return current;
        }
        current = current.parentNode;
    }
    return null;
}

function findDirectChildByClass(parent, className) {
    if (!parent) return null;
    for (const child of parent.children) {
        if (child.classList && child.classList.contains(className)) {
            return child;
        }
    }
    return null;
}

// =================================================================================
// --- UTILITY FUNCTIONS & HOOKS ---
// =================================================================================
function useInView(options) {
    const [isInView, setIsInView] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    if (ref.current) {
                        observer.unobserve(ref.current);
                    }
                }
            },
            { ...options }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        // Backup timeout: ensure it becomes visible/animates even if IntersectionObserver fails to trigger
        const timeout = setTimeout(() => {
            setIsInView(true);
        }, 200);

        return () => {
            clearTimeout(timeout);
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [options]);

    return [ref, isInView];
}

// =================================================================================
// --- AnimatedIcon Component ---
// =================================================================================
function AnimatedIcon({ svgString, isActive, isInView }) {
    const iconRef = useRef(null);
    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const pathsRef = useRef([]);
    const [hasRevealed, setHasRevealed] = useState(false);

    const ANIMATION_SPEED_MULTIPLIER = 0.88;
    const DURATION = 1 * ANIMATION_SPEED_MULTIPLIER;

    useEffect(() => {
        const container = iconRef.current;
        if (!container || !svgString) return;
        
        let processedSvgString = svgString
            .replace(/width="[^"]*"/, '')
            .replace(/height="[^"]*"/, '')
            .replace(/(<svg[^>]*)/, `$1 style="width: 100%; height: 100%;"`);

        container.innerHTML = processedSvgString;
        const svgElement = container.querySelector('svg');
        if (!svgElement) return;

        pathsRef.current = svgElement.querySelectorAll('[class*="svg-elem-"]');
        if (pathsRef.current.length === 0) return;

        pathsRef.current.forEach((path, index) => {
            if (path.tagName.toLowerCase() === 'g') {
                path.dataset.animationType = 'ignore';
                return;
            }

            const originalStroke = path.getAttribute('stroke');
            const originalStrokeWidth = path.getAttribute('stroke-width');
            const originalFill = path.getAttribute('fill');
            const isStrokedElement = originalStroke && originalStroke !== 'none' && originalStrokeWidth !== '0';
            const isFilledElement = originalFill && originalFill !== 'none';
            const delay = (0.1 * index) * ANIMATION_SPEED_MULTIPLIER;
            
            if (isStrokedElement) {
                path.dataset.animationType = 'stroke';
                const length = path.getTotalLength();
                if (length > 0) {
                    path.style.strokeDasharray = length;
                    path.style.strokeDashoffset = length;
                    path.style.stroke = 'var(--text-normal)';
                    path.style.strokeWidth = '1.5px';
                    path.style.fill = 'transparent';
                    path.style.transition = `stroke-dashoffset ${DURATION}s ease ${delay}s, fill ${DURATION * 0.7}s ease ${delay + (DURATION * 0.2)}s`;
                }
            } 
            else if (isFilledElement) {
                path.dataset.animationType = 'fill';
                path.style.stroke = 'none';
                path.style.fill = 'transparent';
                path.style.transition = `fill ${DURATION * 0.7}s ease ${delay + (DURATION * 0.2)}s`;
            } 
            else {
                path.dataset.animationType = 'ignore';
            }
        });
    }, [svgString]);

    useEffect(() => {
        if (isInView && !hasRevealed) {
            const paths = pathsRef.current;
            if (!paths || paths.length === 0) return;

            const maxDelay = (0.1 * (paths.length - 1)) * ANIMATION_SPEED_MULTIPLIER;
            const totalRevealTime = (DURATION + maxDelay) * 1000;

            paths.forEach(path => {
                const type = path.dataset.animationType;
                if (type === 'stroke') {
                    path.style.strokeDashoffset = '0';
                } else if (type === 'fill') {
                    path.style.fill = path.getAttribute('fill') || 'var(--text-normal)';
                }
            });

            setTimeout(() => {
                setHasRevealed(true);
            }, totalRevealTime);
        }
    }, [isInView, hasRevealed]);

    useEffect(() => {
        if (!hasRevealed) return;
        const paths = pathsRef.current;
        if (!paths || paths.length === 0) return;
        const maxDelay = (0.1 * (paths.length - 1)) * ANIMATION_SPEED_MULTIPLIER;
        const totalAnimationTime = (DURATION + maxDelay) * 1000;

        const resetToUndrawn = () => {
            paths.forEach(path => {
                const type = path.dataset.animationType;
                path.style.transition = 'none';
                if (type === 'stroke') {
                    const length = path.getTotalLength();
                    path.style.strokeDashoffset = length;
                    path.style.fill = 'transparent';
                } else if (type === 'fill') {
                    path.style.fill = 'transparent';
                }
            });
        };

        const triggerDraw = () => {
            paths.forEach((path, index) => {
                const type = path.dataset.animationType;
                const delay = (0.1 * index) * ANIMATION_SPEED_MULTIPLIER;
                if (type === 'stroke') {
                    path.style.transition = `stroke-dashoffset ${DURATION}s ease ${delay}s, fill ${DURATION * 0.7}s ease ${delay + (DURATION * 0.2)}s`;
                    path.style.strokeDashoffset = '0';
                } else if (type === 'fill') {
                    path.style.transition = `fill ${DURATION * 0.7}s ease ${delay + (DURATION * 0.2)}s`;
                    path.style.fill = path.getAttribute('fill') || 'var(--text-normal)';
                }
            });
        };

        const runAnimationCycle = () => {
            resetToUndrawn();
            // Force reflow
            if (iconRef.current) iconRef.current.getBoundingClientRect();
            
            timeoutRef.current = setTimeout(() => {
                triggerDraw();
            }, 50);
        };

        if (isActive) {
            runAnimationCycle();
            intervalRef.current = setInterval(runAnimationCycle, totalAnimationTime + 600);
        } else {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
            // Re-draw immediately to ensure fully drawn state when not active
            triggerDraw();
        }

        return () => {
            clearInterval(intervalRef.current);
            clearTimeout(timeoutRef.current);
        };
    }, [isActive, hasRevealed]);

    return <div ref={iconRef} className="animated-icon-container" style={{ width: '100%', height: '100%' }} />;
}

// =================================================================================
// --- IconTileView Component ---
// =================================================================================
function IconTileView({ iconConfig, index, onTileClick, isEnlarged, onClose }) {
    const STYLES = {
        fullTabWrapper: { 
            position: 'relative', height: "140px", width: "140px", padding: "16px", 
            boxSizing: "border-box", display: "flex", flexDirection: "column", 
            alignItems: "center", justifyContent: "center", gap: "8px", 
            backgroundColor: THEME.bg.secondary, 
            border: `1px solid ${THEME.border}`, 
            borderRadius: "8px", 
            color: THEME.text.primary, 
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", 
            cursor: "pointer" 
        },
        mainSvgContainer: { 
            width: "70px", height: "70px", 
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.3s ease"
        },
        enlargedWrapper: { 
            position: 'relative', width: '600px', height: '600px', padding: "32px", 
            boxSizing: "border-box", display: "flex", flexDirection: "column", 
            alignItems: "center", justifyContent: "center", gap: "20px", 
            backgroundColor: THEME.bg.secondary, 
            border: `2px solid ${THEME.accent.purple}`, 
            borderRadius: "16px", 
            color: THEME.text.primary, 
            cursor: 'default',
            boxShadow: '0 0 40px var(--background-modifier-hover)'
        },
        enlargedSvgContainer: { 
            width: "400px", height: "400px", 
            display: "flex", alignItems: "center", justifyContent: "center" 
        },
        closeButton: { 
            position: 'absolute', top: '20px', right: '20px', 
            background: 'none', border: 'none',
            cursor: 'pointer', zIndex: 10,
            padding: '8px',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        compactText: { 
            margin: 0, 
            color: THEME.text.secondary, 
            fontSize: "13px", 
            textAlign: 'center',
            fontWeight: '500'
        },
    };
    const [isHovering, setIsHovering] = useState(false);
    const [tileRef, isInView] = useInView({ threshold: 0.1 });
    const isActive = isEnlarged || isHovering;
    
    const wrapperStyle = isEnlarged ? STYLES.enlargedWrapper : {
        ...STYLES.fullTabWrapper,
        ...(isHovering ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 20px var(--background-modifier-hover)`,
            borderColor: THEME.accent.purple
        } : {})
    };
    
    const svgContainerStyle = {
        ...(isEnlarged ? STYLES.enlargedSvgContainer : STYLES.mainSvgContainer),
        ...(isHovering && !isEnlarged ? { transform: 'scale(1.1)' } : {})
    };

    return (
        <div 
            ref={tileRef} 
            style={wrapperStyle} 
            onMouseEnter={() => !isEnlarged && setIsHovering(true)} 
            onMouseLeave={() => !isEnlarged && setIsHovering(false)} 
            onClick={() => !isEnlarged && onTileClick && onTileClick(index)}
        >
            {isEnlarged && (
                <button 
                    style={{
                        ...STYLES.closeButton,
                        backgroundColor: isHovering ? THEME.bg.tertiary : 'transparent'
                    }}
                    onClick={onClose} 
                    title="Close"
                >
                    <dc.Icon icon="x" style={{ fontSize: '24px', color: THEME.text.secondary }} />
                </button>
            )}
            <div style={svgContainerStyle}>
                <AnimatedIcon svgString={iconConfig.svg} isActive={isActive} isInView={isEnlarged || isInView} />
            </div>
            <p style={isEnlarged ? {...STYLES.compactText, fontSize: '18px', color: THEME.text.primary} : STYLES.compactText}>
                {iconConfig.name}
            </p>
        </div>
    );
}

// =================================================================================
// --- BasicView Component ---
// =================================================================================
function BasicView({ onTileClick }) {
    const STYLES = {
        gridContainer: { 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px', 
            padding: '24px', 
            justifyContent: 'center', 
            transition: 'filter 0.3s ease-in-out',
            backgroundColor: THEME.bg.primary,
            minHeight: '400px'
        }
    };

    return (
        <div style={STYLES.gridContainer}>
            {ICONS.map((icon, index) => (
                <IconTileView 
                    key={icon.name || index} 
                    iconConfig={icon} 
                    onTileClick={onTileClick} 
                    index={index} 
                    isEnlarged={false} 
                />
            ))}
        </div>
    );
}

// =================================================================================
// --- LiveInputView Component ---
// =================================================================================
function LiveInputView() {
    const [svgInput, setSvgInput] = useState(``);
    const [cssInput, setCssInput] = useState(``);
    const [liveIcon, setLiveIcon] = useState(null);
    const [animationKey, setAnimationKey] = useState(0);

    // --- State and Refs for Video Export ---
    const [exportStatus, setExportStatus] = useState('idle'); // 'idle', 'rendering', 'done'
    const [isLibLoaded, setIsLibLoaded] = useState(false);
    const [libError, setLibError] = useState(null);
    const [exportResolution, setExportResolution] = useState(1080); // Default resolution
    const canvgRef = useRef(null);

    // --- Load the Canvg library ---
    useEffect(() => {
        async function loadCanvgModule() {
            if (canvgRef.current) return;
            try {
                const module = await import('https://cdn.jsdelivr.net/npm/canvg@4.0.3/+esm');
                canvgRef.current = module.Canvg; // Correctly get the named export
                if (canvgRef.current) {
                    console.log("[SVGAnimations] Canvg class loaded successfully.");
                    setIsLibLoaded(true);
                } else {
                    throw new Error("Canvg class not found in the loaded module.");
                }
            } catch (err) {
                console.error("[SVGAnimations] Failed to load or initialize Canvg ES Module:", err);
                setLibError("Failed to load rendering library. Check network or CSP.");
            }
        }
        loadCanvgModule();
    }, []);

    // --- Function to generate self-animating CSS for SVG download ---
    const generateSelfAnimatingCSS = (svgString) => {
        if (!svgString) return '';
    
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.visibility = 'hidden';
        tempContainer.innerHTML = svgString;
        document.body.appendChild(tempContainer);
    
        const elements = Array.from(tempContainer.querySelectorAll('[class*="svg-elem-"]'));
        let cssString = '';
        let keyframesString = '';
        
        const DURATION = 1 * 0.88;
        const totalDuration = (DURATION + 0.1 * (elements.length > 0 ? elements.length - 1 : 0) * 0.88);
    
        elements.forEach((el, index) => {
            const className = el.getAttribute('class');
            if (!className || el.tagName.toLowerCase() === 'g') return;
    
            const originalStroke = el.getAttribute('stroke');
            const originalStrokeWidth = el.getAttribute('stroke-width');
            const originalFill = el.getAttribute('fill') || 'black';
            
            const isStrokedElement = originalStroke && originalStroke !== 'none' && originalStrokeWidth !== '0';
            const isFilledElement = originalFill && originalFill !== 'none';
    
            const delay = (0.1 * index) * 0.88;
            const animDuration = DURATION;
            const fillAnimDuration = DURATION * 0.7;
    
            const startPercent = parseFloat(((delay / totalDuration) * 100).toFixed(2));
            const endPercent = parseFloat(((delay + animDuration) / totalDuration) * 100).toFixed(2);
            const fillStartPercent = parseFloat((((delay + (animDuration * 0.2)) / totalDuration) * 100).toFixed(2));
            const fillEndPercent = parseFloat((((delay + (animDuration * 0.2) + fillAnimDuration) / totalDuration) * 100).toFixed(2));
            
            if (isStrokedElement && typeof el.getTotalLength === 'function') {
                const length = el.getTotalLength();
                if (length > 0) {
                    keyframesString += `@keyframes ${className}-anim-stroke { 0%, ${startPercent}% { stroke-dashoffset: ${length}; } ${endPercent > 100 ? 100 : endPercent}%, 100% { stroke-dashoffset: 0; } }\n`;
                    cssString += `.${className} { stroke-dasharray: ${length}; animation: ${className}-anim-stroke ${totalDuration}s ease-out infinite; }\n`;
                }
            } else if (isFilledElement) {
                keyframesString += `@keyframes ${className}-anim-fill { 0%, ${fillStartPercent}% { fill-opacity: 0; } ${fillEndPercent > 100 ? 100 : fillEndPercent}%, 100% { fill-opacity: 1; } }\n`;
                cssString += `.${className} { fill: ${originalFill}; animation: ${className}-anim-fill ${totalDuration}s ease-out infinite; }\n`;
            }
        });
    
        document.body.removeChild(tempContainer);
        return keyframesString + cssString;
    };
    
    const handleAnimate = () => {
        setLiveIcon({ name: 'Live Preview', svg: svgInput });
        setAnimationKey(prevKey => prevKey + 1);
    };

    const handleDownloadSVG = () => {
        if (!svgInput) return alert("There is no SVG code to download.");
        const selfAnimatingCSS = generateSelfAnimatingCSS(svgInput);
        const finalSvg = svgInput.replace(/(<svg[^>]*>)/, `$1<style>${selfAnimatingCSS}${cssInput}</style>`);
        
        const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'icon-animated.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleExportVideo = async () => {
        if (!isLibLoaded || !svgInput || exportStatus === 'rendering') return;
        if (libError) return alert(libError);
        setExportStatus('rendering');
    
        const tempContainer = document.createElement('div');
        try {
            const Canvg = canvgRef.current;
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.innerHTML = svgInput;
            document.body.appendChild(tempContainer);
    
            const svgEl = tempContainer.querySelector('svg');
            if (!svgEl) {
                throw new Error("Could not find a valid SVG element in the provided code.");
            }
    
            const canvas = document.createElement('canvas');
            canvas.width = exportResolution;
            canvas.height = exportResolution;
            const ctx = canvas.getContext('2d');
    
            const paths = Array.from(svgEl.querySelectorAll('[class*="svg-elem-"]'));
            const DURATION = 1 * 0.88;
            const maxDelay = (paths.length > 0 ? paths.length - 1 : 0) * 0.1 * 0.88;
            const revealTime = (DURATION + maxDelay) * 1000;
    
            paths.forEach((path) => {
                 if (path.tagName.toLowerCase() === 'g') { path.dataset.animationType = 'ignore'; return; }
                 const originalStroke = path.getAttribute('stroke');
                 const originalStrokeWidth = path.getAttribute('stroke-width');
                 const isStroked = originalStroke && originalStroke !== 'none' && originalStrokeWidth !== '0';
    
                if (isStroked && typeof path.getTotalLength === 'function') {
                    path.dataset.animationType = 'stroke';
                    const len = path.getTotalLength();
                    path.style.strokeDasharray = len;
                    path.style.strokeDashoffset = len;
                } else {
                    path.dataset.animationType = 'fill';
                    path.style.fillOpacity = 0;
                }
            });
    
            const stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(stream, { 
                mimeType: 'video/webm',
                videoBitsPerSecond: 2500000 * (exportResolution / 720)
            });
            const chunks = [];
            recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'animation.webm';
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(tempContainer);
                setExportStatus('done');
                setTimeout(() => setExportStatus('idle'), 2000);
            };
    
            recorder.start();
            let startTime = performance.now();
            const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    
            const recordFrame = async (currentTime) => {
                const elapsedTime = currentTime - startTime;
    
                if (elapsedTime >= revealTime + 500) { 
                    if (recorder.state === 'recording') recorder.stop();
                    return;
                }
                
                paths.forEach((path, index) => {
                    const type = path.dataset.animationType;
                    const delay = (0.1 * index) * 0.88 * 1000;
                    const timeIntoAnim = elapsedTime - delay;
                    
                    if (timeIntoAnim < 0) return;
    
                    if (type === 'stroke') {
                        const strokeProgress = easeInOutQuad(Math.min(timeIntoAnim / (DURATION * 1000), 1));
                        const length = parseFloat(path.style.strokeDasharray);
                        path.style.strokeDashoffset = length * (1 - strokeProgress);
                    }
                    
                    const fillDelay = delay + (DURATION * 0.2 * 1000);
                    const timeIntoFill = elapsedTime - fillDelay;
                    if (timeIntoFill >= 0) {
                         const fillProgress = easeInOutQuad(Math.min(timeIntoFill / (DURATION * 0.7 * 1000), 1));
                         path.style.fillOpacity = fillProgress;
                    }
                });
 
                const currentSvgString = svgEl.outerHTML;
 
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const canvgInstance = await Canvg.fromString(ctx, currentSvgString);
                await canvgInstance.render();
                
                requestAnimationFrame(recordFrame);
            };
    
            requestAnimationFrame(recordFrame);
    
        } catch (error) {
            console.error("[SVGAnimations] Video export failed:", error);
            alert(`Video export failed: ${error.message}`);
            if (tempContainer.parentNode) {
                document.body.removeChild(tempContainer);
            }
            setExportStatus('idle');
        }
    };

    const STYLES = {
        container: { 
            padding: '24px', 
            maxWidth: '100%', 
            margin: '0 auto',
            backgroundColor: THEME.bg.primary,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        },
        header: {
            marginBottom: '24px',
            textAlign: 'center',
            flexShrink: 0
        },
        title: { 
            fontSize: '28px', 
            color: THEME.text.primary, 
            marginBottom: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
        },
        subtitle: {
            fontSize: '14px',
            color: THEME.text.secondary,
            marginBottom: '8px'
        },
        tipBox: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: THEME.bg.tertiary,
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            fontSize: '13px',
            color: THEME.text.secondary,
            marginTop: '12px'
        },
        tipLink: {
            color: THEME.accent.purple,
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'color 0.2s ease'
        },
        mainContent: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflow: 'hidden',
            minHeight: 0
        },
        editorSection: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            flexShrink: 0
        },
        textareaContainer: { 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: THEME.bg.secondary,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${THEME.border}`,
            boxShadow: `0 4px 6px var(--background-modifier-hover)`,
            minHeight: 0,
            overflow: 'hidden'
        },
        labelRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexShrink: 0
        },
        label: { 
            color: THEME.text.primary,
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        labelIcon: {
            fontSize: '18px',
            color: THEME.accent.purple
        },
        textarea: { 
            width: '100%', 
            flex: 1,
            minHeight: '200px',
            boxSizing: 'border-box', 
            backgroundColor: THEME.bg.primary, 
            border: `2px solid ${THEME.border}`, 
            color: THEME.text.primary, 
            borderRadius: '8px', 
            padding: '16px', 
            fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
            fontSize: '13px',
            lineHeight: '1.6',
            resize: 'none',
            transition: 'all 0.3s ease',
            outline: 'none',
            overflow: 'auto'
        },
        actionsSection: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            backgroundColor: THEME.bg.secondary,
            borderRadius: '12px',
            border: `1px solid ${THEME.border}`,
            flexShrink: 0
        },
        actionsHeader: {
            fontSize: '16px',
            fontWeight: '600',
            color: THEME.text.primary,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        buttonGrid: { 
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center'
        },
        button: { 
            padding: '16px 20px', 
            cursor: 'pointer', 
            fontSize: '14px', 
            fontWeight: '600', 
            backgroundColor: THEME.accent.purple, 
            color: 'var(--text-on-accent)', 
            border: 'none', 
            borderRadius: '8px', 
            textAlign: 'center', 
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: `0 2px 8px var(--background-modifier-border)`
        },
        buttonDisabled: {
            backgroundColor: THEME.bg.tertiary,
            cursor: 'not-allowed',
            opacity: 0.5,
            boxShadow: 'none',
            color: THEME.text.secondary
        },
        previewSection: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'auto'
        },
        previewHeader: {
            fontSize: '16px',
            fontWeight: '600',
            color: THEME.text.primary,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
        },
        preview: { 
            flex: 1,
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            backgroundColor: THEME.bg.secondary,
            borderRadius: '12px',
            border: `2px dashed ${THEME.border}`,
            minHeight: '250px'
        },
        previewPlaceholder: {
            color: THEME.text.secondary,
            fontSize: '15px',
            textAlign: 'center',
            lineHeight: '1.8'
        },
        select: { 
            padding: '16px 40px 16px 16px', 
            borderRadius: '8px', 
            border: `2px solid ${THEME.border}`, 
            backgroundColor: THEME.bg.primary, 
            color: THEME.text.primary,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.3s ease',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '20px',
            minWidth: '150px',
            height: '54px',
            boxSizing: 'border-box',
            lineHeight: '1.4'
        }
    };

    return (
        <div style={STYLES.container}>
            <style>{cssInput}</style>
            
            <div style={STYLES.header}>
                <h2 style={STYLES.title}>
                    <dc.Icon icon="code-2" style={{ fontSize: '28px', color: THEME.accent.purple }} />
                    Live SVG & CSS Animator
                </h2>
                <p style={STYLES.subtitle}>
                    Create and animate SVG graphics with custom CSS styling
                </p>
                <div style={STYLES.tipBox}>
                    <dc.Icon icon="lightbulb" style={{ fontSize: '16px', color: THEME.accent.purple }} />
                    <span>
                        Utilize{' '}
                        <a 
                            href="https://svgartista.net/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={STYLES.tipLink}
                        >
                            SVG Artista
                        </a>
                        {' '}to create quick animations
                    </span>
                </div>
            </div>

            <div style={STYLES.mainContent}>
                <div style={STYLES.editorSection}>
                    <div style={STYLES.textareaContainer}>
                        <div style={STYLES.labelRow}>
                            <label style={STYLES.label} htmlFor="svg-input">
                                <dc.Icon icon="code" style={STYLES.labelIcon} />
                                SVG Code
                            </label>
                        </div>
                        <textarea 
                            id="svg-input" 
                            style={STYLES.textarea} 
                            placeholder="Paste your SVG code here..."
                            value={svgInput} 
                            onChange={(e) => setSvgInput(e.target.value)}
                        />
                    </div>
                    <div style={STYLES.textareaContainer}>
                        <div style={STYLES.labelRow}>
                            <label style={STYLES.label} htmlFor="css-input">
                                <dc.Icon icon="palette" style={STYLES.labelIcon} />
                                Additional CSS
                            </label>
                        </div>
                        <textarea 
                            id="css-input" 
                            style={STYLES.textarea} 
                            placeholder="Add custom CSS animations, hover effects, etc..."
                            value={cssInput} 
                            onChange={(e) => setCssInput(e.target.value)}
                        />
                    </div>
                </div>

                <div style={STYLES.actionsSection}>
                    <div style={STYLES.actionsHeader}>
                        <dc.Icon icon="settings" style={{ fontSize: '18px', color: THEME.accent.purple }} />
                        Actions & Export
                    </div>
                    <div style={STYLES.buttonGrid}>
                        <button 
                            style={STYLES.button} 
                            onClick={handleAnimate}
                        >
                            <dc.Icon icon="play" style={{ fontSize: '18px' }} />
                            Animate Preview
                        </button>
                        <button 
                            style={STYLES.button} 
                            onClick={handleDownloadSVG}
                        >
                            <dc.Icon icon="download" style={{ fontSize: '18px' }} />
                            Download SVG
                        </button>
                        <button 
                            style={
                                exportStatus === 'rendering' || !isLibLoaded 
                                    ? {...STYLES.button, ...STYLES.buttonDisabled} 
                                    : STYLES.button
                            } 
                            onClick={handleExportVideo} 
                            disabled={!isLibLoaded || exportStatus === 'rendering'}
                        >
                            <dc.Icon icon="video" style={{ fontSize: '18px' }} />
                            {!isLibLoaded && (libError ? 'Export Error' : 'Loading...')}
                            {isLibLoaded && exportStatus === 'idle' && 'Export Video'}
                            {isLibLoaded && exportStatus === 'rendering' && 'Rendering...'}
                            {isLibLoaded && exportStatus === 'done' && 'Done!'}
                        </button>
                        <select 
                            style={STYLES.select} 
                            value={exportResolution} 
                            onChange={(e) => setExportResolution(parseInt(e.target.value))}
                        >
                            <option value={720}>720p WebM</option>
                            <option value={1080}>1080p WebM</option>
                            <option value={1440}>1440p WebM</option>
                        </select>
                    </div>
                </div>

                <div style={STYLES.previewSection}>
                    <div style={STYLES.previewHeader}>
                        <dc.Icon icon="eye" style={{ fontSize: '18px', color: THEME.accent.purple }} />
                        Live Preview
                    </div>
                    <div style={STYLES.preview}>
                        {liveIcon ? (
                            <IconTileView 
                                key={animationKey}
                                iconConfig={liveIcon} 
                                isEnlarged={false} 
                                index={0}
                            />
                        ) : (
                            <div style={STYLES.previewPlaceholder}>
                                <dc.Icon icon="image" style={{ fontSize: '48px', color: THEME.text.secondary, marginBottom: '16px' }} />
                                <p>Paste SVG code and click "Animate Preview" to see the result</p>
                                <p style={{ fontSize: '13px', marginTop: '8px', opacity: 0.7 }}>
                                    Your animation will appear here
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =================================================================================
// --- Main App Component ---
// =================================================================================
function App() {
    const instanceId = useRef(Math.random().toString(36).substr(2, 5)).current;
    const uniqueWrapperClass = `interactive-wrapper-${instanceId}`;
    const [view, setView] = useState('basic');
    const [isFullTab, setIsFullTab] = useState(true);
    const [enlargedIndex, setEnlargedIndex] = useState(null);
    const containerRef = useRef(null);
    const stateRefs = useRef({}).current;

    const STYLES = {
        hoverEffectStyle: `
            .status-bar, .view-footer { display: none !important; }
            .${uniqueWrapperClass} .subtle-icon {
                opacity: 0;
                transform: scale(0.9);
                transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            }
            .${uniqueWrapperClass}:hover .subtle-icon {
                opacity: 0.7;
                transform: scale(1);
            }
            .${uniqueWrapperClass} .subtle-icon:hover {
                opacity: 1;
            }
            .${uniqueWrapperClass} .subtle-icon:hover .exit-tooltip {
                visibility: visible;
                opacity: 1;
            }
        `,
        iconContainer: {
            position: 'absolute',
            top: '20px',
            right: '24px',
            fontFamily: 'monospace',
            fontSize: '16px',
            color: THEME.text.secondary,
            userSelect: 'none',
            cursor: 'pointer',
            zIndex: 10,
        },
        tooltip: {
            visibility: 'hidden',
            opacity: 0,
            backgroundColor: THEME.bg.secondary,
            color: THEME.text.primary,
            textAlign: 'center',
            borderRadius: '6px',
            padding: '6px 12px',
            position: 'absolute',
            zIndex: 1,
            top: '50%',
            right: '120%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `1px solid ${THEME.border}`,
        },
        container: {
            backgroundColor: THEME.bg.primary,
            height: '100%',
            minHeight: '100vh',
            borderRadius: '0',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        },
        header: {
            padding: '24px',
            borderBottom: `2px solid ${THEME.border}`,
            backgroundColor: THEME.bg.secondary,
            flexShrink: 0
        },
        title: {
            margin: 0,
            fontSize: '28px',
            fontWeight: '600',
            color: THEME.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        subtitle: {
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: THEME.text.secondary
        },
        nav: { 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '12px', 
            padding: '20px',
            backgroundColor: THEME.bg.primary,
            flexShrink: 0
        },
        contentArea: {
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
        },
        navButton: { 
            padding: '12px 24px', 
            cursor: 'pointer', 
            backgroundColor: THEME.bg.secondary, 
            border: `1px solid ${THEME.border}`, 
            color: THEME.text.secondary, 
            borderRadius: '8px', 
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        activeButton: { 
            color: THEME.text.primary, 
            backgroundColor: THEME.bg.tertiary, 
            borderColor: THEME.accent.purple,
            boxShadow: `0 0 20px var(--background-modifier-hover)`
        },
        compactWrapper: {
            padding: '24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: `2px dashed ${THEME.border}`,
            borderRadius: '8px',
            backgroundColor: THEME.bg.secondary,
        },
        compactText: { 
            margin: 0, 
            color: THEME.text.secondary, 
            fontSize: '14px' 
        },
        buttonGroup: { 
            display: 'flex', 
            gap: '12px' 
        },
        button: {
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-on-accent)',
            backgroundColor: THEME.accent.purple,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        },
        modalOverlay: { 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0,
            bottom: 0,
            width: '100%', 
            height: '100%', 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 10000, 
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            padding: '20px',
            boxSizing: 'border-box',
            overflow: 'auto'
        },
        modalContent: { 
            cursor: 'default',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 'auto',
            maxWidth: '100%',
            maxHeight: '100%'
        },
    };

    // Full-tab mode effect
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isFullTab) return;
        
        const targetPaneContent = findNearestAncestorWithClass(
            container,
            'workspace-leaf-content'
        );
        
        if (!targetPaneContent) {
            setIsFullTab(false);
            return;
        }
        
        const contentWrapper =
            findDirectChildByClass(targetPaneContent, 'view-content') ||
            targetPaneContent;
        
        stateRefs.originalParent = container.parentNode;
        stateRefs.placeholder = document.createElement('div');
        stateRefs.placeholder.style.display = 'none';
        container.parentNode.insertBefore(stateRefs.placeholder, container);
        
        stateRefs.parentPositionInfo = {
            element: contentWrapper,
            original: window.getComputedStyle(contentWrapper).position,
        };
        
        if (stateRefs.parentPositionInfo.original === 'static') {
            contentWrapper.style.position = 'relative';
        }
        
        contentWrapper.appendChild(container);
        
        Object.assign(container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '9998',
            overflow: 'auto',
        });
        
        return () => {
            if (stateRefs.placeholder?.parentNode) {
                stateRefs.placeholder.parentNode.replaceChild(
                    container,
                    stateRefs.placeholder
                );
            }
            if (stateRefs.parentPositionInfo?.element) {
                stateRefs.parentPositionInfo.element.style.position =
                    stateRefs.parentPositionInfo.original === 'static'
                        ? ''
                        : stateRefs.parentPositionInfo.original;
            }
            container.removeAttribute('style');
            Object.keys(stateRefs).forEach((key) => (stateRefs[key] = null));
        };
    }, [isFullTab]);

    const handleExitFullTab = (e) => {
        e.stopPropagation();
        setIsFullTab(false);
    };
    
    const handleEnterFullTab = () => setIsFullTab(true);

    const handleCloseEnlarged = (e) => { 
        if (e) e.stopPropagation(); 
        setEnlargedIndex(null); 
    };

    useEffect(() => { 
        document.body.style.overflow = enlargedIndex !== null ? 'hidden' : 'auto'; 
        return () => { document.body.style.overflow = 'auto'; }; 
    }, [enlargedIndex]);

    // Compact mode view
    if (!isFullTab) {
        return (
            <div ref={containerRef} style={STYLES.compactWrapper}>
                <p style={STYLES.compactText}>SVG Animations component is in compact mode.</p>
                <div style={STYLES.buttonGroup}>
                    <button style={STYLES.button} onClick={handleEnterFullTab}>
                        Enter Full Tab Mode
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef}>
            <style>{STYLES.hoverEffectStyle}</style>
            <div style={{ ...STYLES.container, filter: enlargedIndex !== null ? 'blur(5px)' : 'none' }} className={uniqueWrapperClass}>
                <div
                    style={STYLES.iconContainer}
                    className="subtle-icon"
                    onClick={handleExitFullTab}
                >
                    &lt;/&gt;
                    <span className="exit-tooltip" style={STYLES.tooltip}>
                        Close Full Mode
                    </span>
                </div>
                <div style={STYLES.header}>
                    <h1 style={STYLES.title}>
                        <dc.Icon icon="sparkles" style={{ fontSize: '32px', color: THEME.accent.purple }} />
                        SVG Animations
                    </h1>
                    <p style={STYLES.subtitle}>Animate and export beautiful SVG graphics</p>
                </div>
                <nav style={STYLES.nav}>
                    <button 
                        style={view === 'basic' ? {...STYLES.navButton, ...STYLES.activeButton} : STYLES.navButton} 
                        onClick={() => setView('basic')}
                    >
                        <dc.Icon icon="grid-3x3" style={{ fontSize: '16px' }} />
                        Icon Grid
                    </button>
                    <button 
                        style={view === 'live' ? {...STYLES.navButton, ...STYLES.activeButton} : STYLES.navButton} 
                        onClick={() => setView('live')}
                    >
                        <dc.Icon icon="code-2" style={{ fontSize: '16px' }} />
                        Build Your Own SVG
                    </button>
                </nav>

                <div style={STYLES.contentArea}>
                    {view === 'basic' ? (
                        <BasicView onTileClick={setEnlargedIndex} />
                    ) : (
                        <LiveInputView />
                    )}
                </div>
            </div>

            {enlargedIndex !== null && (
                <div style={STYLES.modalOverlay} onClick={handleCloseEnlarged}>
                    <div style={STYLES.modalContent} onClick={(e) => e.stopPropagation()}>
                        <IconTileView 
                            key={`enlarged-${ICONS[enlargedIndex].name}`} 
                            iconConfig={ICONS[enlargedIndex]} 
                            isEnlarged={true} 
                            onClose={handleCloseEnlarged} 
                            index={enlargedIndex} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

return { App };
