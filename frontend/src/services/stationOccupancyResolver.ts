import { StationInfrastructureData, TrackDefinition } from "../data/stationInfrastructure";

export interface ResolvedTrain {
  trainNumber: string;
  trainName: string;
  compactLabel: string;
  serviceType: string;
  direction: "UP" | "DOWN";
  platformNumber: number;
  trackId: string;
  movementState: string;
  scheduledTime: string;
  estimatedTime: string;
  delayMinutes: number;
  delayFormatted: string;
  delayCategory: "ON_TIME" | "MINOR" | "MODERATE" | "SEVERE";
  originDestination: string;
  sourceType: "REAL_PUBLIC" | "SIMULATED" | "SYNTHETIC";
}

export interface ResolvedTrack {
  trackId: string;
  name: string;
  trackType: "PLATFORM" | "UP_MAIN" | "DOWN_MAIN" | "LOOP" | "SIDING" | "THROUGH";
  platformNumber?: number;
  platformSide?: "ISLAND" | "SIDE";
  lengthMeters: number;
  speedLimitKmph: number;
  electrified: boolean;
  status: "AVAILABLE" | "OCCUPIED" | "BLOCKED" | "MAINTENANCE";
  occupant?: ResolvedTrain;
  activeBlock?: any;
  activeRestriction?: any;
  notes?: string;
  yOffset: number;
}

export interface StationConflict {
  trainNumber: string;
  trainName: string;
  location: string;
  conflictType: "DUPLICATE_POSITION" | "BLOCK_OVERLAP" | "ROUTING_CONFLICT";
  message: string;
  timestamp: string;
}

export interface ResolvedStationState {
  tracks: ResolvedTrack[];
  trains: ResolvedTrain[];
  conflicts: StationConflict[];
  summary: {
    totalPlatforms: number;
    occupiedPlatforms: number;
    clearPlatforms: number;
    activeTrainsCount: number;
    activeBlocksCount: number;
    restrictionsCount: number;
  };
}

/**
 * Clean compact train label generation
 * e.g. "12002 SHATABDI (DN)", "20171 VANDE BHARAT (UP)", "12616 GT EXP"
 */
function generateCompactLabel(trainNumber: string, trainName: string, direction: "UP" | "DOWN"): string {
  const upper = trainName.toUpperCase();
  let service = "EXP";
  if (upper.includes("SHATABDI")) service = "SHATABDI";
  else if (upper.includes("VANDE BHARAT")) service = "VANDE BHARAT";
  else if (upper.includes("GRAND TRUNK") || upper.includes("GT EXPRESS")) service = "GT EXP";
  else if (upper.includes("CHHATTISGARH")) service = "CHHATTISGARH";
  else if (upper.includes("RAJDHANI")) service = "RAJDHANI";
  else if (upper.includes("SUPERFAST")) service = "SF EXP";
  else if (upper.includes("FREIGHT") || upper.includes("BOXN")) service = "GOODS";

  return `${trainNumber} ${service}`;
}

/**
 * Format delay into railway control terminology
 */
function formatDelay(delayMin: number): { formatted: string; category: "ON_TIME" | "MINOR" | "MODERATE" | "SEVERE" } {
  if (delayMin <= 0) {
    return { formatted: "On Time", category: "ON_TIME" };
  } else if (delayMin <= 5) {
    return { formatted: `+${delayMin}m late`, category: "MINOR" };
  } else if (delayMin <= 20) {
    return { formatted: `+${delayMin}m late`, category: "MODERATE" };
  } else {
    return { formatted: `+${delayMin}m late`, category: "SEVERE" };
  }
}

/**
 * Authoritative Station Occupancy Resolution Engine
 * Follows strict single-location invariant: ONE train = ONE track location.
 */
export function resolveStationOccupancy(
  infrastructure: StationInfrastructureData,
  operationalData: any
): ResolvedStationState {
  const livePlatforms: any[] = operationalData?.platforms_layout || [];
  const presentTrains: any[] = operationalData?.present_trains || [];
  const loopLinesLayout: any[] = operationalData?.loop_lines_layout || [];
  const holdingTrains: any[] = operationalData?.holding_trains || [];
  const nearbyBlocks: any[] = operationalData?.nearby_blocks || [];
  const nearbyRestrictions: any[] = operationalData?.nearby_restrictions || [];

  const placedTrainNumbers = new Set<string>();
  const resolvedTrains: ResolvedTrain[] = [];
  const conflicts: StationConflict[] = [];

  // Step 1: Resolve Platform Tracks
  const resolvedTracks: ResolvedTrack[] = infrastructure.tracks.map((track) => {
    let status: "AVAILABLE" | "OCCUPIED" | "BLOCKED" | "MAINTENANCE" = "AVAILABLE";
    let occupant: ResolvedTrain | undefined = undefined;

    // Check for maintenance blocks on this track
    const matchingBlock = nearbyBlocks.find((b: any) => {
      if (!b.track_name) return false;
      const bName = b.track_name.toLowerCase();
      const tName = track.name.toLowerCase();
      if (bName.includes(tName) || tName.includes(bName)) return true;
      if (track.trackType === "UP_MAIN" && bName.includes("up main")) return true;
      if (track.trackType === "DOWN_MAIN" && bName.includes("down main")) return true;
      return false;
    });

    if (matchingBlock) {
      status = matchingBlock.status === "APPROVED" || matchingBlock.status === "ACTIVE" ? "MAINTENANCE" : "BLOCKED";
    }

    // Check for restrictions
    const matchingRestriction = nearbyRestrictions.find((r: any) => {
      if (!r.track_name) return false;
      return r.track_name.toLowerCase().includes(track.name.toLowerCase());
    });

    // Check Platform Occupancy (strictly data-backed)
    if (track.platformNumber) {
      const platLayout = livePlatforms.find(
        (p: any) => p.platform_number === track.platformNumber
      );

      if (platLayout && platLayout.status === "OCCUPIED" && platLayout.occupied_by) {
        const occString = String(platLayout.occupied_by).trim().toLowerCase();

        // Match against present_trains by exact name or train number
        let matchedTrain = presentTrains.find((t: any) => {
          if (!t) return false;
          const tName = String(t.train_name || "").trim().toLowerCase();
          const tNum = String(t.train_number || "").trim();
          if (tName === occString) return true;
          if (occString.includes(tNum)) return true;
          // Cleaned keywords match
          if (tName.includes("shatabdi") && occString.includes("shatabdi")) {
            // Distinguish UP vs DOWN Shatabdi
            if (tName.includes("new delhi - rani") && occString.includes("new delhi - rani")) return true;
            if (tName.includes("rani kamalapati - new delhi") && occString.includes("rani kamalapati - new delhi")) return true;
          }
          return false;
        });

        // Fallback: match by platform number if present_train explicitly has current_platform
        if (!matchedTrain) {
          matchedTrain = presentTrains.find(
            (t: any) => t.current_platform === track.platformNumber
          );
        }

        if (matchedTrain) {
          const tNum = String(matchedTrain.train_number);

          // INVARIANT CHECK: A train must NEVER be displayed on two platforms simultaneously
          if (placedTrainNumbers.has(tNum)) {
            conflicts.push({
              trainNumber: tNum,
              trainName: matchedTrain.train_name,
              location: `Platform ${track.platformNumber}`,
              conflictType: "DUPLICATE_POSITION",
              message: `Duplicate occupancy rejected: Train ${tNum} is already assigned to another platform.`,
              timestamp: new Date().toLocaleTimeString(),
            });
            // Do NOT render on this duplicate platform
            status = "AVAILABLE";
          } else {
            // First authoritative placement
            placedTrainNumbers.add(tNum);

            const dir: "UP" | "DOWN" =
              matchedTrain.current_track?.includes("UP") ||
              matchedTrain.train_name?.toLowerCase().includes("to new delhi") ||
              matchedTrain.train_name?.toLowerCase().includes("rani kamalapati - new delhi")
                ? "UP"
                : "DOWN";

            const delayInfo = formatDelay(matchedTrain.delay_minutes ?? 0);

            occupant = {
              trainNumber: tNum,
              trainName: matchedTrain.train_name,
              compactLabel: generateCompactLabel(tNum, matchedTrain.train_name, dir),
              serviceType: matchedTrain.train_type || "PASSENGER",
              direction: dir,
              platformNumber: track.platformNumber,
              trackId: track.id,
              movementState: matchedTrain.status || "SCHEDULED_HALT",
              scheduledTime: matchedTrain.scheduled_time || "12:00",
              estimatedTime: matchedTrain.estimated_time || "12:00",
              delayMinutes: matchedTrain.delay_minutes ?? 0,
              delayFormatted: delayInfo.formatted,
              delayCategory: delayInfo.category,
              originDestination: matchedTrain.train_name || "Regional Express Service",
              sourceType: matchedTrain.source_type || "SIMULATED",
            };

            resolvedTrains.push(occupant);
            status = "OCCUPIED";
          }
        } else {
          // Occupied in layout but no matching present_train object
          const pseudoNumber = `TRN-P${track.platformNumber}`;
          if (!placedTrainNumbers.has(pseudoNumber)) {
            placedTrainNumbers.add(pseudoNumber);
            const delayInfo = formatDelay(0);
            occupant = {
              trainNumber: pseudoNumber,
              trainName: platLayout.occupied_by,
              compactLabel: `${pseudoNumber} ${platLayout.occupied_by.substring(0, 12)}`,
              serviceType: "PASSENGER",
              direction: "DOWN",
              platformNumber: track.platformNumber,
              trackId: track.id,
              movementState: "BERTHING",
              scheduledTime: "--:--",
              estimatedTime: "--:--",
              delayMinutes: 0,
              delayFormatted: delayInfo.formatted,
              delayCategory: "ON_TIME",
              originDestination: platLayout.occupied_by,
              sourceType: "SIMULATED",
            };
            resolvedTrains.push(occupant);
            status = "OCCUPIED";
          }
        }
      } else {
        // Platform is CLEAR
        status = matchingBlock ? status : "AVAILABLE";
        occupant = undefined;
      }
    }

    // Check Loop Occupancy (only for loop lines with holding freight)
    if (track.trackType === "LOOP") {
      const loopMatch = loopLinesLayout.find(
        (l: any) => l.status === "HOLDING_FREIGHT"
      );
      if (loopMatch && holdingTrains.length > 0) {
        const freight = holdingTrains[0];
        const fNum = freight.train_number || freight.id || "BOXNHL-501";
        if (!placedTrainNumbers.has(fNum)) {
          placedTrainNumbers.add(fNum);
          const delayInfo = formatDelay(freight.delay_minutes ?? 0);
          occupant = {
            trainNumber: fNum,
            trainName: freight.train_name || "Heavy Goods Coal Rake",
            compactLabel: `${fNum} FREIGHT`,
            serviceType: "FREIGHT",
            direction: freight.direction || "UP",
            platformNumber: 0,
            trackId: track.id,
            movementState: "HELD_FOR_PRECEDENCE",
            scheduledTime: "--:--",
            estimatedTime: "--:--",
            delayMinutes: freight.delay_minutes ?? 0,
            delayFormatted: delayInfo.formatted,
            delayCategory: delayInfo.category,
            originDestination: "Goods Marshalling Yard",
            sourceType: "SIMULATED",
          };
          resolvedTrains.push(occupant);
          status = "OCCUPIED";
        }
      }
    }

    return {
      trackId: track.id,
      name: track.name,
      trackType: track.trackType,
      platformNumber: track.platformNumber,
      platformSide: track.platformSide,
      lengthMeters: track.lengthMeters,
      speedLimitKmph: track.speedLimitKmph,
      electrified: track.electrified,
      status,
      occupant,
      activeBlock: matchingBlock,
      activeRestriction: matchingRestriction,
      notes: track.notes,
      yOffset: track.yOffset,
    };
  });

  // Calculate summary metrics
  const platformTracks = resolvedTracks.filter((t) => t.platformNumber);
  const occupiedPlatforms = platformTracks.filter((t) => t.status === "OCCUPIED").length;
  const clearPlatforms = platformTracks.length - occupiedPlatforms;

  return {
    tracks: resolvedTracks,
    trains: resolvedTrains,
    conflicts,
    summary: {
      totalPlatforms: platformTracks.length,
      occupiedPlatforms,
      clearPlatforms,
      activeTrainsCount: resolvedTrains.length,
      activeBlocksCount: nearbyBlocks.length,
      restrictionsCount: nearbyRestrictions.length,
    },
  };
}
