import { IStorage } from '../storage';
import type { BadgeDefinition, EmployeePoints, PerformanceEvent } from '@shared/schema';

interface BadgeCriteria {
  type: string;
  threshold: number;
  timeframe?: string;
  conditions?: any;
}

const POINTS_CONFIG = {
  ORDER_PICKED: 10,
  ORDER_PACKED: 10,
  ITEM_PICKED: 1,
  ITEM_PACKED: 1,
  FAST_PICK_BONUS: 5,
  FAST_PACK_BONUS: 5,
  PERFECT_ACCURACY_BONUS: 10,
  STREAK_BONUS_PER_DAY: 2,
  LEVEL_XP_MULTIPLIER: 100,
};

const SPEED_THRESHOLDS = {
  FAST_PICK_SECONDS: 300,
  FAST_PACK_SECONDS: 180,
};

const DEFAULT_BADGES: Omit<BadgeDefinition, 'id' | 'createdAt'>[] = [
  {
    code: 'first_pick',
    name: 'First Pick',
    nameVi: 'Lần Chọn Đầu Tiên',
    nameCz: 'První Výběr',
    nameDe: 'Erster Pick',
    description: 'Complete your first order pick',
    descriptionVi: 'Hoàn thành lần chọn đơn hàng đầu tiên',
    descriptionCz: 'Dokončete svůj první výběr objednávky',
    descriptionDe: 'Schließen Sie Ihre erste Bestellauswahl ab',
    icon: 'Package',
    color: 'bronze',
    category: 'milestone',
    tier: 1,
    pointsRequired: null,
    criteria: { type: 'orders_picked', threshold: 1, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'picker_10',
    name: '10 Orders Picked',
    nameVi: '10 Đơn Đã Chọn',
    nameCz: '10 Vybratých Objednávek',
    nameDe: '10 Bestellungen Gepickt',
    description: 'Pick 10 orders',
    descriptionVi: 'Chọn 10 đơn hàng',
    descriptionCz: 'Vyberte 10 objednávek',
    descriptionDe: 'Picken Sie 10 Bestellungen',
    icon: 'Package',
    color: 'bronze',
    category: 'volume',
    tier: 1,
    pointsRequired: null,
    criteria: { type: 'orders_picked', threshold: 10, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 10,
  },
  {
    code: 'picker_50',
    name: '50 Orders Picked',
    nameVi: '50 Đơn Đã Chọn',
    nameCz: '50 Vybratých Objednávek',
    nameDe: '50 Bestellungen Gepickt',
    description: 'Pick 50 orders',
    descriptionVi: 'Chọn 50 đơn hàng',
    descriptionCz: 'Vyberte 50 objednávek',
    descriptionDe: 'Picken Sie 50 Bestellungen',
    icon: 'Package',
    color: 'silver',
    category: 'volume',
    tier: 2,
    pointsRequired: null,
    criteria: { type: 'orders_picked', threshold: 50, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 11,
  },
  {
    code: 'picker_100',
    name: 'Century Picker',
    nameVi: 'Người Chọn 100',
    nameCz: 'Výběrčí Století',
    nameDe: 'Jahrhundert-Picker',
    description: 'Pick 100 orders',
    descriptionVi: 'Chọn 100 đơn hàng',
    descriptionCz: 'Vyberte 100 objednávek',
    descriptionDe: 'Picken Sie 100 Bestellungen',
    icon: 'Trophy',
    color: 'gold',
    category: 'volume',
    tier: 3,
    pointsRequired: null,
    criteria: { type: 'orders_picked', threshold: 100, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 12,
  },
  {
    code: 'packer_10',
    name: '10 Orders Packed',
    nameVi: '10 Đơn Đã Đóng Gói',
    nameCz: '10 Zabalených Objednávek',
    nameDe: '10 Bestellungen Gepackt',
    description: 'Pack 10 orders',
    descriptionVi: 'Đóng gói 10 đơn hàng',
    descriptionCz: 'Zabalte 10 objednávek',
    descriptionDe: 'Packen Sie 10 Bestellungen',
    icon: 'Box',
    color: 'bronze',
    category: 'volume',
    tier: 1,
    pointsRequired: null,
    criteria: { type: 'orders_packed', threshold: 10, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 20,
  },
  {
    code: 'packer_50',
    name: '50 Orders Packed',
    nameVi: '50 Đơn Đã Đóng Gói',
    nameCz: '50 Zabalených Objednávek',
    nameDe: '50 Bestellungen Gepackt',
    description: 'Pack 50 orders',
    descriptionVi: 'Đóng gói 50 đơn hàng',
    descriptionCz: 'Zabalte 50 objednávek',
    descriptionDe: 'Packen Sie 50 Bestellungen',
    icon: 'Box',
    color: 'silver',
    category: 'volume',
    tier: 2,
    pointsRequired: null,
    criteria: { type: 'orders_packed', threshold: 50, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 21,
  },
  {
    code: 'packer_100',
    name: 'Century Packer',
    nameVi: 'Người Đóng Gói 100',
    nameCz: 'Balič Století',
    nameDe: 'Jahrhundert-Packer',
    description: 'Pack 100 orders',
    descriptionVi: 'Đóng gói 100 đơn hàng',
    descriptionCz: 'Zabalte 100 objednávek',
    descriptionDe: 'Packen Sie 100 Bestellungen',
    icon: 'Trophy',
    color: 'gold',
    category: 'volume',
    tier: 3,
    pointsRequired: null,
    criteria: { type: 'orders_packed', threshold: 100, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 22,
  },
  {
    code: 'speed_demon',
    name: 'Speed Demon',
    nameVi: 'Quỷ Tốc Độ',
    nameCz: 'Rychlostní Démon',
    nameDe: 'Geschwindigkeitsdämon',
    description: 'Complete 10 fast picks (under 5 minutes each)',
    descriptionVi: 'Hoàn thành 10 lần chọn nhanh (dưới 5 phút mỗi lần)',
    descriptionCz: 'Dokončete 10 rychlých výběrů (pod 5 minut každý)',
    descriptionDe: 'Absolvieren Sie 10 schnelle Picks (unter 5 Minuten)',
    icon: 'Zap',
    color: 'blue',
    category: 'speed',
    tier: 2,
    pointsRequired: null,
    criteria: { type: 'fast_picks', threshold: 10, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 30,
  },
  {
    code: 'streak_5',
    name: '5 Day Streak',
    nameVi: 'Chuỗi 5 Ngày',
    nameCz: 'Série 5 Dní',
    nameDe: '5 Tage Serie',
    description: 'Meet daily target for 5 consecutive days',
    descriptionVi: 'Đạt mục tiêu hàng ngày trong 5 ngày liên tiếp',
    descriptionCz: 'Splňte denní cíl 5 po sobě jdoucích dnů',
    descriptionDe: 'Erreichen Sie das Tagesziel an 5 aufeinanderfolgenden Tagen',
    icon: 'Flame',
    color: 'orange',
    category: 'streak',
    tier: 1,
    pointsRequired: null,
    criteria: { type: 'streak', threshold: 5, timeframe: 'consecutive_days' },
    isActive: true,
    sortOrder: 40,
  },
  {
    code: 'streak_10',
    name: '10 Day Streak',
    nameVi: 'Chuỗi 10 Ngày',
    nameCz: 'Série 10 Dní',
    nameDe: '10 Tage Serie',
    description: 'Meet daily target for 10 consecutive days',
    descriptionVi: 'Đạt mục tiêu hàng ngày trong 10 ngày liên tiếp',
    descriptionCz: 'Splňte denní cíl 10 po sobě jdoucích dnů',
    descriptionDe: 'Erreichen Sie das Tagesziel an 10 aufeinanderfolgenden Tagen',
    icon: 'Flame',
    color: 'red',
    category: 'streak',
    tier: 2,
    pointsRequired: null,
    criteria: { type: 'streak', threshold: 10, timeframe: 'consecutive_days' },
    isActive: true,
    sortOrder: 41,
  },
  {
    code: 'level_5',
    name: 'Level 5',
    nameVi: 'Cấp 5',
    nameCz: 'Úroveň 5',
    nameDe: 'Stufe 5',
    description: 'Reach level 5',
    descriptionVi: 'Đạt cấp 5',
    descriptionCz: 'Dosáhněte úrovně 5',
    descriptionDe: 'Erreichen Sie Stufe 5',
    icon: 'Star',
    color: 'purple',
    category: 'level',
    tier: 1,
    pointsRequired: null,
    criteria: { type: 'level', threshold: 5, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 50,
  },
  {
    code: 'level_10',
    name: 'Level 10',
    nameVi: 'Cấp 10',
    nameCz: 'Úroveň 10',
    nameDe: 'Stufe 10',
    description: 'Reach level 10',
    descriptionVi: 'Đạt cấp 10',
    descriptionCz: 'Dosáhněte úrovně 10',
    descriptionDe: 'Erreichen Sie Stufe 10',
    icon: 'Crown',
    color: 'gold',
    category: 'level',
    tier: 3,
    pointsRequired: null,
    criteria: { type: 'level', threshold: 10, timeframe: 'all_time' },
    isActive: true,
    sortOrder: 51,
  },
];

export class PerformanceService {
  constructor(private storage: IStorage) {}

  async initializeBadges(): Promise<void> {
    const existingBadges = await this.storage.getBadgeDefinitions();
    const existingCodes = new Set(existingBadges.map(b => b.code));

    for (const badge of DEFAULT_BADGES) {
      if (!existingCodes.has(badge.code)) {
        await this.storage.createBadgeDefinition(badge as any);
        console.log(`[Performance] Created badge: ${badge.code}`);
      }
    }
  }

  async recordOrderPicked(
    userId: string,
    orderId: string,
    itemCount: number,
    durationSeconds: number
  ): Promise<{ pointsEarned: number; bonusPoints: number; newBadges: string[] }> {
    let bonusPoints = 0;
    let bonusReason = '';

    if (durationSeconds > 0 && durationSeconds < SPEED_THRESHOLDS.FAST_PICK_SECONDS) {
      bonusPoints += POINTS_CONFIG.FAST_PICK_BONUS;
      bonusReason = 'fast_pick';
    }

    const basePoints = POINTS_CONFIG.ORDER_PICKED + (itemCount * POINTS_CONFIG.ITEM_PICKED);

    await this.storage.createPerformanceEvent({
      userId,
      eventType: 'order_picked',
      orderId,
      pointsEarned: basePoints,
      bonusPoints,
      bonusReason: bonusReason || undefined,
      durationSeconds,
      itemCount,
      metadata: {},
    });

    const currentPoints = await this.storage.getEmployeePoints(userId);
    const totalPicked = (currentPoints?.totalOrdersPicked || 0) + 1;
    const totalItemsPicked = (currentPoints?.totalItemsPicked || 0) + itemCount;
    const newTotalPoints = (currentPoints?.totalPoints || 0) + basePoints + bonusPoints;
    const newWeeklyPoints = (currentPoints?.weeklyPoints || 0) + basePoints + bonusPoints;
    const newMonthlyPoints = (currentPoints?.monthlyPoints || 0) + basePoints + bonusPoints;
    const newXP = (currentPoints?.experiencePoints || 0) + basePoints + bonusPoints;
    const newLevel = Math.floor(newXP / POINTS_CONFIG.LEVEL_XP_MULTIPLIER) + 1;

    let newAvgPickTime: number | undefined;
    if (currentPoints?.avgPickTimeSeconds && currentPoints?.totalOrdersPicked) {
      const prevTotal = parseFloat(currentPoints.avgPickTimeSeconds) * currentPoints.totalOrdersPicked;
      newAvgPickTime = (prevTotal + durationSeconds) / totalPicked;
    } else {
      newAvgPickTime = durationSeconds;
    }

    let fastestPick = currentPoints?.fastestPickSeconds || durationSeconds;
    if (durationSeconds > 0 && durationSeconds < fastestPick) {
      fastestPick = durationSeconds;
    }

    await this.storage.upsertEmployeePoints(userId, {
      totalPoints: newTotalPoints,
      weeklyPoints: newWeeklyPoints,
      monthlyPoints: newMonthlyPoints,
      totalOrdersPicked: totalPicked,
      totalItemsPicked,
      avgPickTimeSeconds: String(newAvgPickTime),
      fastestPickSeconds: fastestPick,
      experiencePoints: newXP,
      level: newLevel,
      lastActiveDate: new Date().toISOString().split('T')[0],
    } as any);

    const newBadges = await this.checkAndAwardBadges(userId, {
      totalOrdersPicked: totalPicked,
      level: newLevel,
    });

    return { pointsEarned: basePoints, bonusPoints, newBadges };
  }

  async recordOrderPacked(
    userId: string,
    orderId: string,
    itemCount: number,
    durationSeconds: number
  ): Promise<{ pointsEarned: number; bonusPoints: number; newBadges: string[] }> {
    let bonusPoints = 0;
    let bonusReason = '';

    if (durationSeconds > 0 && durationSeconds < SPEED_THRESHOLDS.FAST_PACK_SECONDS) {
      bonusPoints += POINTS_CONFIG.FAST_PACK_BONUS;
      bonusReason = 'fast_pack';
    }

    const basePoints = POINTS_CONFIG.ORDER_PACKED + (itemCount * POINTS_CONFIG.ITEM_PACKED);

    await this.storage.createPerformanceEvent({
      userId,
      eventType: 'order_packed',
      orderId,
      pointsEarned: basePoints,
      bonusPoints,
      bonusReason: bonusReason || undefined,
      durationSeconds,
      itemCount,
      metadata: {},
    });

    const currentPoints = await this.storage.getEmployeePoints(userId);
    const totalPacked = (currentPoints?.totalOrdersPacked || 0) + 1;
    const totalItemsPacked = (currentPoints?.totalItemsPacked || 0) + itemCount;
    const newTotalPoints = (currentPoints?.totalPoints || 0) + basePoints + bonusPoints;
    const newWeeklyPoints = (currentPoints?.weeklyPoints || 0) + basePoints + bonusPoints;
    const newMonthlyPoints = (currentPoints?.monthlyPoints || 0) + basePoints + bonusPoints;
    const newXP = (currentPoints?.experiencePoints || 0) + basePoints + bonusPoints;
    const newLevel = Math.floor(newXP / POINTS_CONFIG.LEVEL_XP_MULTIPLIER) + 1;

    let newAvgPackTime: number | undefined;
    if (currentPoints?.avgPackTimeSeconds && currentPoints?.totalOrdersPacked) {
      const prevTotal = parseFloat(currentPoints.avgPackTimeSeconds) * currentPoints.totalOrdersPacked;
      newAvgPackTime = (prevTotal + durationSeconds) / totalPacked;
    } else {
      newAvgPackTime = durationSeconds;
    }

    let fastestPack = currentPoints?.fastestPackSeconds || durationSeconds;
    if (durationSeconds > 0 && durationSeconds < fastestPack) {
      fastestPack = durationSeconds;
    }

    await this.storage.upsertEmployeePoints(userId, {
      totalPoints: newTotalPoints,
      weeklyPoints: newWeeklyPoints,
      monthlyPoints: newMonthlyPoints,
      totalOrdersPacked: totalPacked,
      totalItemsPacked,
      avgPackTimeSeconds: String(newAvgPackTime),
      fastestPackSeconds: fastestPack,
      experiencePoints: newXP,
      level: newLevel,
      lastActiveDate: new Date().toISOString().split('T')[0],
    } as any);

    const newBadges = await this.checkAndAwardBadges(userId, {
      totalOrdersPacked: totalPacked,
      level: newLevel,
    });

    return { pointsEarned: basePoints, bonusPoints, newBadges };
  }

  private async checkAndAwardBadges(
    userId: string,
    stats: { totalOrdersPicked?: number; totalOrdersPacked?: number; level?: number; streak?: number }
  ): Promise<string[]> {
    const newBadges: string[] = [];
    const allBadges = await this.storage.getBadgeDefinitions();

    for (const badge of allBadges) {
      if (!badge.isActive) continue;

      const hasEarned = await this.storage.hasUserEarnedBadge(userId, badge.code);
      if (hasEarned) continue;

      const criteria = badge.criteria as BadgeCriteria;
      let shouldAward = false;

      switch (criteria.type) {
        case 'orders_picked':
          if (stats.totalOrdersPicked && stats.totalOrdersPicked >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        case 'orders_packed':
          if (stats.totalOrdersPacked && stats.totalOrdersPacked >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        case 'level':
          if (stats.level && stats.level >= criteria.threshold) {
            shouldAward = true;
          }
          break;
        case 'streak':
          if (stats.streak && stats.streak >= criteria.threshold) {
            shouldAward = true;
          }
          break;
      }

      if (shouldAward) {
        await this.storage.awardBadge({
          userId,
          badgeId: badge.id,
          awardedFor: `Earned for reaching ${criteria.threshold} ${criteria.type}`,
          metadata: stats,
        });
        newBadges.push(badge.code);
        console.log(`[Performance] Awarded badge "${badge.code}" to user ${userId}`);
      }
    }

    return newBadges;
  }

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time', limit: number = 10) {
    return this.storage.getLeaderboard(period, limit);
  }

  async getUserPerformance(userId: string) {
    const points = await this.storage.getEmployeePoints(userId);
    const badges = await this.storage.getEmployeeBadges(userId);
    const recentEvents = await this.storage.getPerformanceEvents(userId, 20);
    const allBadgeDefs = await this.storage.getBadgeDefinitions();

    const earnedBadgeIds = new Set(badges.map(b => b.badgeId));
    const badgesWithStatus = allBadgeDefs.map(def => ({
      ...def,
      earned: earnedBadgeIds.has(def.id),
      awardedAt: badges.find(b => b.badgeId === def.id)?.awardedAt,
    }));

    return {
      points: points || {
        totalPoints: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        totalOrdersPicked: 0,
        totalOrdersPacked: 0,
        level: 1,
        experiencePoints: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      badges: badgesWithStatus,
      earnedBadgesCount: badges.length,
      totalBadgesCount: allBadgeDefs.length,
      recentEvents,
    };
  }

  async resetWeeklyPoints(): Promise<void> {
    console.log('[Performance] Resetting weekly points...');
  }

  async resetMonthlyPoints(): Promise<void> {
    console.log('[Performance] Resetting monthly points...');
  }
}
