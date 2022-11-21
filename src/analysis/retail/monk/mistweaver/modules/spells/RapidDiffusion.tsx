import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { TALENTS_MONK } from 'common/TALENTS';
import SPELLS from 'common/SPELLS';
import Events, { ApplyBuffEvent, HealEvent } from 'parser/core/Events';
import HotTrackerMW from '../core/HotTrackerMW';
import MistyPeaks from './MistyPeaks';
import Vivify from './Vivify';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import ItemHealingDone from 'parser/ui/ItemHealingDone';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SpellLink from 'interface/SpellLink';
import Combatants from 'parser/shared/modules/Combatants';
import { formatNumber } from 'common/format';
import { TooltipElement } from 'interface';

class RapidDiffusion extends Analyzer {
  get totalRemThroughput() {
    return this.remHealing + this.remAbsorbed;
  }

  get totalVivifyThroughput() {
    return this.extraVivHealing + this.extraVivAbsorbed;
  }

  static dependencies = {
    hotTracker: HotTrackerMW,
    combatants: Combatants,
    mistyPeaks: MistyPeaks,
    vivify: Vivify,
  };
  hotTracker!: HotTrackerMW;
  combatants!: Combatants;
  mistyPeaks!: MistyPeaks;
  vivify!: Vivify;
  remCount: number = 0;
  remHealing: number = 0;
  remAbsorbed: number = 0;
  remOverHealing: number = 0;
  extraMistyPeaksProcs: number = 0;
  extraVivCleaves: number = 0;
  extraVivHealing: number = 0;
  extraVivOverhealing: number = 0;
  extraVivAbsorbed: number = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_MONK.RAPID_DIFFUSION_TALENT);
    if (!this.active) {
      return;
    }
    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.RENEWING_MIST_HEAL),
      this.handleReMApply,
    );
    this.addEventListener(
      Events.heal.by(SELECTED_PLAYER).spell(SPELLS.RENEWING_MIST_HEAL),
      this.handleReMHeal,
    );
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.VIVIFY), this.handleVivify);
  }

  handleReMApply(event: ApplyBuffEvent) {
    const playerId = event.targetID;
    if (
      !this.hotTracker.hots[playerId] ||
      !this.hotTracker.hots[playerId][SPELLS.RENEWING_MIST_HEAL.id]
    ) {
      return;
    }
    const hot = this.hotTracker.hots[playerId][SPELLS.RENEWING_MIST_HEAL.id];
    if (this.hotTracker.fromRapidDiffusion(hot) && !this.hotTracker.fromBounce(hot)) {
      this.remCount += 1;
    }
  }

  handleReMHeal(event: HealEvent) {
    const playerId = event.targetID;
    if (
      !this.hotTracker.hots[playerId] ||
      !this.hotTracker.hots[playerId][SPELLS.RENEWING_MIST_HEAL.id]
    ) {
      return;
    }
    const hot = this.hotTracker.hots[playerId][SPELLS.RENEWING_MIST_HEAL.id];
    if (this.hotTracker.fromRapidDiffusion(hot)) {
      this.remHealing += event.amount || 0;
      this.remAbsorbed += event.absorbed || 0;
      this.remOverHealing += event.overheal || 0;
    }
  }

  handleVivify(event: HealEvent) {
    const targetId = event.targetID;
    if (
      !this.hotTracker.hots[targetId] ||
      !this.hotTracker.hots[targetId][SPELLS.RENEWING_MIST_HEAL.id]
    ) {
      return;
    }
    const hot = this.hotTracker.hots[targetId][SPELLS.RENEWING_MIST_HEAL.id];
    if (this.hotTracker.fromRapidDiffusion(hot)) {
      this.extraVivCleaves += 1;
      this.extraVivHealing += event.amount || 0;
      this.extraVivOverhealing += event.overheal || 0;
      this.extraVivAbsorbed += event.absorbed || 0;
    }
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(13)}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <ul>
            <li>
              Additional Renewing Mist Total Throughput: {formatNumber(this.totalRemThroughput)}
            </li>
            <li>Extra Vivify Cleaves: {this.extraVivCleaves}</li>
            <li>Extra Vivify Healing: {formatNumber(this.totalVivifyThroughput)}</li>
          </ul>
        }
      >
        <TalentSpellText talent={TALENTS_MONK.RAPID_DIFFUSION_TALENT}>
          <ItemHealingDone amount={this.totalRemThroughput + this.totalVivifyThroughput} />
          <br />
          <TooltipElement
            content={
              <>
                Rapid Diffusion has an internal cooldown of 0.25 seconds, so this number may be
                slightly lower than your total{' '}
                <SpellLink id={TALENTS_MONK.RISING_SUN_KICK_TALENT.id} /> and{' '}
                <SpellLink id={TALENTS_MONK.ENVELOPING_MIST_TALENT.id} /> casts.
              </>
            }
          >
            {this.remCount}{' '}
            <small>
              additional <SpellLink id={TALENTS_MONK.RENEWING_MIST_TALENT} />
            </small>
          </TooltipElement>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default RapidDiffusion;
