/* eslint prefer-destructuring: 0, react/no-array-index-key: 0, indent: 0, no-loop-func: 0, jsx-a11y/no-static-element-interactions: 0, jsx-a11y/click-events-have-key-events: 0 */
import React from 'react';
import minBy from 'lodash/minBy';
import $ from 'jquery';
import { keyframes } from 'styled-components';

import meBg from '../other/hunter-assassin.png';
import enemyBg from '../other/hunter-assassin1.png';
import enemyAttackBg from '../other/hunter-assassin-attack.png';
import groundBg from '../other/ground.jpg';
import barrierBg from '../other/barrier.jpg';

const ME_DURATION = 300;

const DANGEROUS_DISTANCE = 2;
const CALM_VISIBILITY_AREA = 4;
const WALKIE_TALKIE_RADIUS = 8;

const HEALTH = 30;

const cell = 60;
const field = {
  ox: 16,
  oy: 24,
  visiblewidth: 500,
  id: 'field101010101100',
};

const blocks = ['3', '45', '32', '24'];

const directions = [
  [1, 0, 90, 90],
  [-1, 0, 270, 90],
  [0, 1, 180, 90],
  [0, -1, 360, 90],
  [-1, -1, 315, 135],
  [1, 1, 135, 135],
  [-1, 1, 225, 135],
  [1, -1, 45, 135],
];

const defaultState = {
  isGameOver: false,
  barriers: {},
  enemiesNumber: null,
  enemies: [],
  me: {
    posX: 1,
    posY: field.oy - 2,
    target: {},
    direction: [0, 0, 0, 0],
    health: HEALTH,
    track: null,
    lastVisiblePosition: {
      posX: null,
      posY: null,
    },
  },
};

class Kek extends React.Component {
  state = defaultState;

  componentDidMount() {
    let callEnemiesMoving = true;

    this.getBarriers();
    this.getEnemies();
    this.animateField();

    setInterval(() => {
      if (!this.state.isGameOver) {
        this.personsMoving(callEnemiesMoving);
        callEnemiesMoving = !callEnemiesMoving;
      }
    }, ME_DURATION);
  }

  componentDidUpdate = (_, prevState) => {
    if (this.state.isGameOver && this.state.isGameOver !== prevState.isGameOver) {
      alert(this.state.isGameOver);
      this.reloadApp();
    }
  };

  isGameOver = (health, enemiesNumber) => {
    if (health <= 0) {
      return 'You losed';
    } else if (enemiesNumber <= 0) {
      return 'You win';
    }
  };

  getEnemies = () => {
    const oxy = Math.min(field.ox, field.oy);
    const minNumber = Math.floor((oxy * 4) / 10);
    const maxNumber = Math.floor((oxy * 9) / 10);

    const enemiesNumber = Math.floor(Math.random() * minNumber) + (maxNumber - minNumber);

    const enemies = new Array(enemiesNumber).fill().map((_, index) => ({
      posX: index,
      posY: index,
      direction: [0, 1, 180, 90],
      id: index,
      amIVisible: false,
      target: {},
      isAlive: true,
      shooting: new Audio('https://noisefx.ru/noise_base/07/03136.mp3'),
    }));

    this.setState({
      enemies,
      enemiesNumber,
    });
  };

  isBarrier = (posX, posY) => this.state.barriers[this.setCoord(posX, posY)];

  setCoord = (posX, posY) => `${posX}x${posY}`;

  getCoord = val => [+val.split('x')[0], +val.split('x')[1]];

  amIVisible = enemy => {
    const [x, y, angle, dispersion] = enemy.direction;
    const visibleArea = { [this.setCoord(x, y)]: true };

    let angleWithDispersionX = angle - dispersion;
    let angleWithDispersionY = angle + dispersion;

    if (angleWithDispersionX <= 0) {
      angleWithDispersionX += 360;
    } else if (angleWithDispersionX > 360) {
      angleWithDispersionX -= 360;
    }

    if (angleWithDispersionY <= 0) {
      angleWithDispersionY += 360;
    } else if (angleWithDispersionY > 360) {
      angleWithDispersionY -= 360;
    }

    const [xd1, yd1] = directions.find(drt => drt[2] === angleWithDispersionX);
    const [xd2, yd2] = directions.find(drt => drt[2] === angleWithDispersionY);

    const steps = CALM_VISIBILITY_AREA;

    new Array(steps).fill().forEach((__, directIdx) => {
      const mainPointX = enemy.posX + (directIdx + 1) * x;
      const mainPointY = enemy.posY + (directIdx + 1) * y;

      visibleArea[this.setCoord(mainPointX, mainPointY)] = true;

      new Array(directIdx + 1).fill().forEach((___, reverseIdx) => {
        const pointXd1 = mainPointX + (reverseIdx + 1) * xd1;
        const pointYd1 = mainPointY + (reverseIdx + 1) * yd1;

        const pointXd2 = mainPointX + (reverseIdx + 1) * xd2;
        const pointYd2 = mainPointY + (reverseIdx + 1) * yd2;

        visibleArea[this.setCoord(pointXd1, pointYd1)] = true;
        visibleArea[this.setCoord(pointXd2, pointYd2)] = true;
      });
    });

    const mePosition = this.setCoord(this.state.me.posX, this.state.me.posY);

    let amIVisible = false;

    if (visibleArea[mePosition]) {
      amIVisible = true;

      const { me } = this.state;

      let startEnemyX = enemy.posX;
      let startEnemyY = enemy.posY;

      new Array(steps).fill().forEach(() => {
        if (Math.sqrt((me.posX - startEnemyX) ** 2 + (me.posY - startEnemyY) ** 2) > 0) {
          const shortestWay = minBy(directions, drt => {
            const enemyXdx = startEnemyX + drt[0];
            const enemyYdy = startEnemyY + drt[1];

            return Math.sqrt((me.posX - enemyXdx) ** 2 + (me.posY - enemyYdy) ** 2);
          });

          startEnemyX += shortestWay[0];
          startEnemyY += shortestWay[1];

          if (this.isBarrier(startEnemyX, startEnemyY)) {
            amIVisible = false;
          }
        }
      });
    }

    return amIVisible;
  };

  getEnemyDirection = ({ direction, posX, posY }) => {
    // if next direct item is unavailable
    if (
      posX + direction[0] < 0 ||
      posY + direction[1] >= field.oy ||
      posY + direction[1] < 0 ||
      posX + direction[0] >= field.ox ||
      this.isBarrier(posX + direction[0], posY + direction[1])
    ) {
      // filter available sides to be redirected
      const availableDirections = directions.filter(d => {
        if (
          posX + d[0] < 0 ||
          posY + d[1] >= field.oy ||
          posY + d[1] < 0 ||
          posX + d[0] >= field.ox ||
          this.isBarrier(posX + d[0], posY + d[1])
        ) {
          return false;
        }

        return true;
      });

      const choice = Math.floor(Math.random() * availableDirections.length);

      return {
        direction: availableDirections[choice],
        posX: posX + availableDirections[choice][0],
        posY: posY + availableDirections[choice][1],
      };
    }

    return {
      direction,
      posX: posX + direction[0],
      posY: posY + direction[1],
    };
  };

  personMoving = person => {
    if (Object.keys(person.target).length) {
      return {
        ...person,
        posX: this.getCoord(Object.keys(person.target)[0])[0],
        posY: this.getCoord(Object.keys(person.target)[0])[1],
        direction: person.target[Object.keys(person.target)[0]],
        target: Object.keys(person.target)
          .slice(1)
          .reduce((x, y) => ({ ...x, [y]: person.target[y] }), {}),
      };
    }

    return person;
  };

  personsMoving = callEnemiesMoving => {
    const { me, enemies } = this.state;

    let lastVisiblePosition = {};
    let { health } = me;

    const freshEnemies = enemies.filter(x => x.isAlive).map(enemy => {
      const { direction, posX, posY } = this.getEnemyDirection(enemy);

      const distanceToLastSeenPoint = Math.sqrt(
        (me.lastVisiblePosition.posX - enemy.posX) ** 2 + (me.lastVisiblePosition.posY - enemy.posY) ** 2,
      );

      const teammateSaidPosition = distanceToLastSeenPoint < WALKIE_TALKIE_RADIUS;

      const amIVisible = this.amIVisible(enemy);

      const distanceToMe = Math.sqrt((me.posX - enemy.posX) ** 2 + (me.posY - enemy.posY) ** 2);

      // $Enemy is dead if $me's distance is less than $VALUE and $me is moving
      const isDead = distanceToMe < DANGEROUS_DISTANCE && Object.keys(me.target).length > 0;

      if (isDead) {
        lastVisiblePosition = {
          posX: me.posX,
          posY: me.posY,
        };

        enemy.shooting.pause();

        return {
          ...enemy,
          amIVisible,
          isAlive: !isDead,
        };
      }

      if (amIVisible && health > 0) {
        health -= 1;

        lastVisiblePosition = {
          posX: me.posX,
          posY: me.posY,
        };

        enemy.shooting.play();

        return {
          ...enemy,
          amIVisible,
          isAlive: !isDead,
        };
      }

      // Вызов хода $enemy происходит с частотой в 2 раза реже, чем ход $me

      // Frequent of calling moving method for $enemies - twice less than for $me
      if (!callEnemiesMoving) return enemy;

      if (me.lastVisiblePosition.posX && !Object.keys(enemy.target).length && teammateSaidPosition) {
        const target = this.buildWay(me.lastVisiblePosition.posX, me.lastVisiblePosition.posY, enemy.posX, enemy.posY);

        return this.personMoving({
          ...enemy,
          target,
          isAlive: !isDead,
        });
      }

      return this.personMoving({
        ...enemy,
        direction,
        posX,
        posY,
        amIVisible,
        isAlive: !isDead,
      });
    });

    const trackedEnemy = freshEnemies.find(x => x.id == me.track);

    this.setState({
      enemies: freshEnemies,
      isGameOver: this.isGameOver(health, freshEnemies.length),
      me: {
        ...this.personMoving({
          ...me,
          // Build way to $enemy after click and track him for moving
          target:
            me.track && trackedEnemy
              ? this.buildWay(trackedEnemy.posX, trackedEnemy.posY, me.posX, me.posY)
              : me.target,
        }),
        lastVisiblePosition,
        health,
      },
    });
  };

  animateField = (posx = this.state.me.posX, posy = this.state.me.posY) => {
    $(`#${field.id}`).animate(
      {
        scrollLeft: +posx * cell - Math.min(window.innerWidth, field.visiblewidth) / 2,
        scrollTop: +posy * cell - window.innerHeight / 2,
      },
      ME_DURATION * 2,
    );
  };

  buildWay = (targetX, targetY, startX, startY) => {
    let enemyId = null;

    // Because of $func.bind - as $startX can be action $event
    if (typeof startX !== 'number') {
      enemyId = startX.currentTarget.dataset.enemyId;

      startX = this.state.me.posX;
      startY = this.state.me.posY;
    }

    let posX = startX;
    let posY = startY;

    let loopCounter = 0;
    const loopLimit = 200;

    const startPoint = this.setCoord(posX, posY);

    // Source distance to enemy's destination
    let dist = Math.sqrt((targetX - posX) ** 2 + (targetY - posY) ** 2);
    let history = { [startPoint]: true };

    const badWay = {};

    // Finish way building when modul distance will be equal 0
    while (dist > 0 && loopCounter < loopLimit) {
      loopCounter += 1;

      let availableDirections = directions.filter(d => {
        if (
          posX + d[0] < 0 ||
          posY + d[1] >= field.oy ||
          posY + d[1] < 0 ||
          posX + d[0] >= field.ox ||
          this.isBarrier(posX + d[0], posY + d[1]) ||
          badWay[this.setCoord(posX + d[0], posY + d[1])]
        ) {
          return false;
        }

        return true;
      });

      // Unblock denied direction if there are now other ways
      if (!availableDirections.length) {
        availableDirections = directions.filter(d => badWay[this.setCoord(posX + d[0], posY + d[1])]);
      }

      // Find the most short way among available to point destination
      const shortestWay = minBy(availableDirections, x => {
        const xxx = posX + x[0];
        const yyy = posY + x[1];

        return Math.sqrt((targetX - xxx) ** 2 + (targetY - yyy) ** 2);
      });

      posX += shortestWay[0];
      posY += shortestWay[1];

      // If next step repeats just completed - null history and start point. Else - add to history new step
      if (history[this.setCoord(posX, posY)]) {
        badWay[this.setCoord(posX, posY)] = true;
        history = { [this.setCoord(startX, startY)]: true };
        posX = startX;
        posY = startY;
      } else {
        history[this.setCoord(posX, posY)] = shortestWay;
      }

      dist = Math.sqrt((targetX - posX) ** 2 + (targetY - posY) ** 2);
    }

    // Iteration number is exceeded
    if (loopCounter === loopLimit) return;

    // Delete start point - do not render point again from previous history
    delete history[startPoint];

    if (startX === this.state.me.posX && startY === this.state.me.posY) {
      this.setState({ me: { ...this.state.me, target: history, track: enemyId } });

      // Show animation to point target
      this.animateField(targetX, targetY);
    }

    return history;
  };

  reloadApp = () => {
    window.location.reload();
  };

  getBarriers = () => {
    let barriers = {};

    new Array(field.oy).fill().forEach((_, posY) => {
      new Array(field.ox).fill().forEach((__, posX) => {
        if (posX === 0 || posY === 0 || posX === field.ox - 1 || posY === field.oy - 1) {
          barriers = {
            ...barriers,
            [this.setCoord(posX, posY)]: true,
          };
        }
      });
    });

    new Array(field.oy).fill().forEach((_, posY) => {
      new Array(field.ox).fill().forEach((__, posX) => {
        if (
          barriers[this.setCoord(posX - 1, posY)] ||
          barriers[this.setCoord(posX + 1, posY)] ||
          barriers[this.setCoord(posX, posY + 1)] ||
          barriers[this.setCoord(posX, posY - 1)] ||
          barriers[this.setCoord(posX - 1, posY - 1)] ||
          barriers[this.setCoord(posX - 1, posY + 1)] ||
          barriers[this.setCoord(posX + 1, posY + 1)] ||
          barriers[this.setCoord(posX + 1, posY - 1)]
        ) {
          return;
        }

        const idx = Math.floor(Math.random() * blocks.length);
        const barriersX = blocks[idx][0];
        const barriersY = blocks[idx][1];

        const choice = new Array(blocks[idx].split('').reduce((x, y) => +x + +y, 0)).fill();

        let temp = {};

        choice.forEach((___, index) => {
          let posXX;
          let posYY;

          if (barriersY && index >= +barriersX) {
            posXX = posX + +barriersX;
            posYY = posY + (index - +barriersX);
          } else {
            posXX = posX + index;
            posYY = posY;
          }

          if (
            !barriers[this.setCoord(posXX - 1, posYY)] &&
            !barriers[this.setCoord(posXX + 1, posYY)] &&
            !barriers[this.setCoord(posXX, posYY + 1)] &&
            !barriers[this.setCoord(posXX, posYY - 1)] &&
            !barriers[this.setCoord(posXX - 1, posYY - 1)] &&
            !barriers[this.setCoord(posXX - 1, posYY + 1)] &&
            !barriers[this.setCoord(posXX + 1, posYY + 1)] &&
            !barriers[this.setCoord(posXX + 1, posYY - 1)]
          ) {
            temp[this.setCoord(posXX, posYY)] = true;
          }
        });

        if (Object.keys(temp).length < choice.length) {
          temp = {};
        }

        barriers = {
          ...barriers,
          ...temp,
        };
      });
    });

    this.setState({ barriers });
  };

  getField = () => {
    const { me, enemies } = this.state;

    return (
      <React.Fragment>
        <CL posX={me.posX} posY={me.posY} onClick={null} isMe={me} />

        {enemies.map(enemy => (
          <CL key={`enemy${enemy.id}`} posX={enemy.posX} posY={enemy.posY} onClick={this.buildWay} isEnemy={enemy} />
        ))}

        {new Array(field.oy).fill().map((_, posY) => (
          <div key={posY} style={R}>
            {new Array(field.ox).fill().map((__, posX) => {
              const isTarget = me.target[this.setCoord(posX, posY)];

              return (
                <CL
                  posX={posX}
                  posY={posY}
                  isBarrier={this.isBarrier(posX, posY)}
                  key={`cell${this.setCoord(posX, posY)}`}
                  onClick={this.buildWay}
                  isTarget={isTarget}
                />
              );
            })}
          </div>
        ))}
      </React.Fragment>
    );
  };

  render() {
    return (
      <div style={B}>
        <div className="position-relative">
          <div style={S}>
            <div>Health: {this.state.me.health}</div>
            <div className="d-flex">
              <div className="mr-3" onClick={this.reloadApp}>
                Reload
              </div>
              <div>
                Enemies: {this.state.enemies.length}/{this.state.enemiesNumber}
              </div>
            </div>
          </div>
          <div id={field.id} style={C}>
            {this.getField()}
          </div>
        </div>
      </div>
    );
  }
}

const CL = React.memo(({ posX, posY, isBarrier, isMe, isTarget, onClick, isEnemy }) => (
  <div
    data-enemy-id={isEnemy ? isEnemy.id : ''}
    onClick={!isBarrier && onClick ? onClick.bind(null, posX, posY) : null}
    style={Z({
      posX,
      posY,
      isBarrier,
      isMe,
      isTarget,
      isEnemy,
    })}
  />
));

const S = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  background: 'rgba(50, 50, 50, 0.75)',
  padding: '15px',
  zIndex: 1000000,
  color: '#ffffff',
  display: 'flex',
  justifyContent: 'space-between',
};

function animationBuilder(posX, posY, direction) {
  return keyframes`
    0% {
      top: ${posY * cell - cell * direction[1]}px;
      left: ${posX * cell - cell * direction[0]}px;
    }
    100% {
      top: ${posY * cell}px;
      left: ${posX * cell}px;
    }
  `;
}

const B = {
  display: 'flex',
  justifyContent: 'center',
};

const C = {
  height: '100vh',
  maxWidth: '100vw',
  width: `${field.visiblewidth}px`,
  overflow: 'hidden',
  position: 'relative',
};

const R = {
  display: 'flex',
  flexWrap: 'nowrap',
};

const Z = ({ posX, posY, isEnemy, isMe, isTarget, isBarrier }) => {
  let backgroundImage = `url(${groundBg})`;
  let opacity = 1;

  if (isBarrier) {
    backgroundImage = `url(${barrierBg})`;
  } else if (isEnemy) {
    backgroundImage = `url(${enemyBg})`;

    if (isEnemy.amIVisible) {
      backgroundImage = `url(${enemyAttackBg})`;
    }
  } else if (isMe) {
    backgroundImage = `url(${meBg})`;
  } else if (isTarget) {
    opacity = 0.9;
  }

  const person = isEnemy || isMe;

  const animation = person
    ? {
        animationName: `${animationBuilder(posX, posY, person.direction)}`,
        transform: `rotate(${person.direction[2]}deg)`,
        transition: `${isMe ? ME_DURATION : 2 * ME_DURATION}ms linear`,
        animationDuration: `${isMe ? ME_DURATION : 2 * ME_DURATION}ms`,
        animationTimingFunction: 'linear',
        animationFillMode: 'both',
        zIndex: 100000,
      }
    : {};

  return {
    position: 'absolute',
    top: `${posY * cell}px`,
    left: `${posX * cell}px`,
    width: `${cell}px`,
    height: `${cell}px`,
    backgroundImage,
    backgroundSize: 'cover',
    opacity,
    ...animation,
  };
};

export default Kek;
