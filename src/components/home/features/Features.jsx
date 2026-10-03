"use client";

import styles from "./Features.module.css";
import { useState, useEffect } from "react";
import { CloudUpload, Lock, RefreshCw, Fingerprint } from "lucide-react";

export default function Features() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(window.innerWidth);
    console.log(window.innerWidth);

    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.backgroundLayer} aria-hidden="true" />
      <div className={styles.headlineContainer}>
        <span className={styles.title}>Features</span>
        <div className={styles.headline}>
          <span>Everything You Need to </span>
          <span>Scale Your Operations</span>
        </div>
        <div className={styles.subHeadline}>
          <span>Automate workflows, gain actionable insights, and</span>
          {width > 650 ? (
            <span>
              empower your team with tools designed for modern, fast-growing
              businesses.
            </span>
          ) : (
            <div className={styles.divided}>
              <span>empower your team with tools designed for</span>
              <span>modern, fast-growing businesses.</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <CloudUpload />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Push to deploy</span>
            <span className={styles.featureDescription}>
              Morbi viverra dui mi arcu sed. Tellus semper adipiscing
              suspendisse semper morbi. Odio urna massa nunc massa.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <Lock />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>SSL certificates</span>
            <span className={styles.featureDescription}>
              Sit quis amet rutrum tellus ullamcorper ultricies libero dolor
              eget. Sem sodales gravida quam turpis enim lacus amet.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <RefreshCw />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Simple queues</span>
            <span className={styles.featureDescription}>
              Quisque est vel vulputate cursus. Risus proin diam nunc commodo.
              Lobortis auctor congue commodo diam neque.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <Fingerprint />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Advanced security</span>
            <span className={styles.featureDescription}>
              Arcu egestas dolor vel iaculis in ipsum mauris. Tincidunt mattis
              aliquet hac quis. Id hac maecenas ac donec pharetra eget.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
