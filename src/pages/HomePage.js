import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/redesign/Icons';
import { IsoCube } from '../components/redesign/Icons';
import PageHead from '../components/redesign/PageHead';
import '../styles/balances.css';
import '../styles/home.css';

/**
 * HomePage — landing page. Hero, the elevator pitch, value props,
 * and quick links into the app. Replaces the old MyPanel-rendered
 * config.about block.
 */

export default function HomePage() {
  return (
    <div className="df-page df-home">
      <section className="df-home-hero">
        <div className="df-home-hero__copy">
          <span className="df-eyebrow">DotFlat protocol</span>
          <h1 className="df-home-hero__title">
            A stablecoin that holds its <span className="df-accent">purchasing power</span>.
          </h1>
          <p className="df-home-hero__lead">
            DFC is a fully-collateralized stablecoin backed by a transparent basket of real-world
            commodities — gold, grain, oil, copper, coffee, cattle. While the dollar erodes, DFC
            stays anchored to what people actually buy.
          </p>
          <div className="df-home-hero__cta">
            <Link to="/balances" className="df-btn df-btn--primary">
              <Icon name="wallet" size={16} /> Open the app
            </Link>
            <Link to="/commodities" className="df-btn df-btn--ghost">
              <Icon name="commodity" size={16} /> See the basket
            </Link>
          </div>
        </div>
        <div className="df-home-hero__art" aria-hidden="true">
          <IsoCube size={200} />
          <IsoCube size={120} />
          <IsoCube size={80} />
        </div>
      </section>

      <section className="df-home-quote">
        <blockquote>
          "Only when the last tree has died and the last river been poisoned and the last fish
          been caught will we realise we cannot eat money."
          <cite>— Cree Indian Proverb</cite>
        </blockquote>
      </section>

      <section className="df-home-grid">
        <Card icon="wallet" title="Balances"
              sub="See your DFC, RLE and ETH in one place. Send, receive, and track recent activity."
              to="/balances" cta="Open balances" />
        <Card icon="credit" title="Borrow DFC"
              sub="Open a Collateralized Debt Position with ETH and mint stable, basket-backed DFC."
              to="/credits" cta="Open credit" />
        <Card icon="deposit" title="Earn yield"
              sub="Deposit DFC to earn protocol interest, paid in DFC. Withdraw any time."
              to="/deposits" cta="Start a deposit" />
        <Card icon="auction" title="Auctions"
              sub="Bid on liquidations and protocol buybacks. Three live auction types."
              to="/auctions" cta="Browse auctions" />
        <Card icon="swap" title="Trade"
              sub="Native swap UI for DotFlat token pairs, routed via 0x for the best price."
              to="/pools" cta="Trade tokens" />
        <Card icon="pool" title="Governance"
              sub="Pool tokens, vote on protocol parameters, and shape the future of DotFlat."
              to="/governance" cta="Open governance" />
      </section>

      <section className="df-home-foot">
        <div>
          <span className="df-eyebrow">Verifiable</span>
          <p>Every contract is open and explorable on-chain.</p>
          <Link to="/contracts" className="df-link">View contracts →</Link>
        </div>
        <div>
          <span className="df-eyebrow">Observable</span>
          <p>Live indexer health and event feed for the entire protocol.</p>
          <Link to="/watcher" className="df-link">Open watcher →</Link>
        </div>
      </section>
    </div>
  );
}

function Card({ icon, title, sub, to, cta }) {
  return (
    <Link to={to} className="df-home-card">
      <div className="df-home-card__icon"><Icon name={icon} size={22} /></div>
      <h3>{title}</h3>
      <p>{sub}</p>
      <span className="df-home-card__cta">{cta} <Icon name="arrow-up-right" size={14} /></span>
    </Link>
  );
}
