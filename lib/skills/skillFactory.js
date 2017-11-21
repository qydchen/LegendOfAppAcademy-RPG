const _ = require('./constants');
const Status = require('../character/stats/status');
const { COM, SPL, MIX, OFF, DEF, AOE, SIN, SELF, FIRE, ICE, WIND, SHOCK, PHYS, HOLY, DARK, GEN, SPE, NON } = _;

class Skill {
  constructor(name, type, subtype, targetProp, element, statuses = {}, skillType, resource, multiplier = 1, secMultiplier = 1, buffs = null) {
    this.name = name;
    this.type = type; // 'COM', 'SPL', 'MIX'
    this.subtype = subtype; // 'OFF', 'DEF'
    this.targetProp = targetProp; // 'AOE', 'SIN', 'SELF'
    this.element = element; // 'FIRE', 'ICE', 'SHOCK', 'PHYS', 'HOLY', 'DARK'
    this.statuses = statuses; // {BURN: true, FRZ: false}
    this.skillType = skillType; // 'GEN', 'SPE', 'NON'
    this.resource = resource; // integer
    this.multiplier = multiplier; // float
    this.secMultiplier = secMultiplier; // float
    this.buffs = buffs // array
    this.owner = null;
    this.use = this.assembleSkill();
  }

  belongsTo(owner) {
    this.owner = owner;
  }

  assembleSkill() {
    return function (...targets) {
      try {
        if (targets.length !== 1 && this.targetProp === SIN) {
          throw "You must target something first";
        } else if (targets.length !== 0 && this.targetProp === SELF) {
          throw `${this.name} can be only be used on self`;
        }
        this.handleGeneratorOrSpender();
        if (this.type !== SPL) {
          console.log(`${this.owner.name} performs ${this.name}`);
        } else {
          console.log(`${this.owner.name} casts ${this.name}`);
        }
        if (this.subtype === OFF) {
          this.handleOffensiveSkill(...targets);
        } else {
          this.handleDefensiveSkill(...targets);
        }
      } catch(e) {
        console.log(e);
      }
    }
  }

  handleOffensiveSkill(...targets) {
    const value = this.getValue();

    targets.forEach(target => {
      const damage = value - (target.stats.def * this.secMultiplier);
      target.stats.hp -= damage;
      console.log(`${this.owner.name} deals ${damage} ${this.element} damage to ${target.name}!`)
      if (this.buffs) {
        this.handleBuffs(this.owner);
      }
      target.status = this.handleStatusEffect(target);
      target.checkDeath();
    })
  }

  handleDefensiveSkill(...targets) {
    if (this.targetProp) {
      targets = [this.owner];
    }
    targets.forEach(target => {
      if (!this.handleRez(target)) {
        target.status = this.handleStatusEffect(target);
        this.handleBuffs(target);
      };
    })
  }

  handleStatusEffect(target) {
    let statuses = Object.keys(target.status).filter((status) => target.status[status]);
    statuses.forEach(status => {
      if (!this.statuses[status]) {
        console.log(`${target.name} is no longer ${status}`)
      }
    })
    return Object.assign(new Status, target.status, this.statuses);
  }

  handleRez(target) {
    if (this.name === 'Revive' || this.name === 'Mass Redemption') {
      try {
        if (target.status.DEAD && !this.statuses.DEAD) {
          target.status = this.handleStatusEffect(target);
        } else {
          throw "You can't cast this right now";
        }
      } catch (e) {
        if (this.name === 'Mass Redemption') {
          return true;
        }
        console.log(e);
        return true;
      }
    }
    return false;
  }

  handleBuffs(target) {
    const healValue = this.getValue();
    const buffValue = this.getValue(this.secMultiplier, true);
    if (this.buffs) {
      this.buffs.forEach(buff => {
        switch (buff) {
          case 'hp':
          target.stats[buff] += healValue;
          if (target.stats.hp > target.stats.maxHP) {
            target.stats.hp = target.stats.maxHP;
          }
          console.log(`${this.name} heals ${target.name} for ${healValue}!`);
          break;
        default:
          target.stats[buff] += buffValue;
          console.log(`${this.name} buffs ${target.name}'s ${buff} for ${buffValue}!`);
          break;
        }
      });
    }
  }

  getValue(multiplier = this.multiplier, isBuff = false) {
    let modifier;
    if (isBuff) {
      modifier = this.owner.stats.level;
    } else if (this.type === COM && this.subtype === OFF) {
      modifier = this.owner.stats.atk;
    } else if (this.type === SPL && this.subtype === OFF) {
      modifier = this.owner.stats.spAtk;
    } else if (this.type === COM && this.subtype === DEF) {
      modifier = this.owner.stats.atk;
    } else if (this.type === SPL && this.subtype === DEF) {
      modifier = this.owner.stats.spAtk;
    } else if (this.type === MIX) {
      modifier = this.owner.stats.spAtk + this.owner.stats.atk;
    }
    return Math.round(modifier * multiplier);
  }

  handleGeneratorOrSpender() {
    if (this.skillType === GEN) {
      this.owner.generatePower(this.resource);
    } else if (this.skillType = SPE) {
      this.owner.spendPower(this.resource);
    }
  }

}

module.exports = Skill;