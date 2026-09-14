import Phaser from 'phaser';
import { Arena } from './game/Arena';
import './style.css';
new Phaser.Game({ type: Phaser.AUTO, parent: 'app', width: 1280, height: 800, backgroundColor: '#fafaf8', scene: [Arena], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, input: { keyboard: true } });
