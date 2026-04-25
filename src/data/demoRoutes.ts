import type { RouteResponse } from '../api/routeApi';

const ROUTE_YEOUIDO: RouteResponse = {
  polyline: '_|_dFkeweWhAaBzB_DHIZEtBzDfCxENNTRFJh@fAnAdCpBvDLX?`@CZG\\}CxCMLy@x@eBbBo@n@a@`@wDnDIH_D|CgAdAoA}BEKcAkB[k@]o@aE`E',
  totalTimeSeconds: 1200,
  totalDistanceMeters: 1633,
  signalCheckpoints: [
    { nodeId: 1001, lat: 37.521358, lng: 126.935220, etaFromStartSeconds: 15, signalState: 'RED',   recommendedPace: 'SPEED_UP'  },
    { nodeId: 1002, lat: 37.520133, lng: 126.932622, etaFromStartSeconds: 30, signalState: 'GREEN', recommendedPace: 'NORMAL'    },
    { nodeId: 1003, lat: 37.523168, lng: 126.929653, etaFromStartSeconds: 45, signalState: 'RED',   recommendedPace: 'SLOW_DOWN' },
  ],
};

const ROUTE_YONGSAN: RouteResponse = {
  polyline: 'khbdFqi~eW_@nB[~AAXPFLS@IbAkEH]JaBDKDOVKNMLAPC\\?ZBPNl@h@hDvClDjDh@d@~@|@~@`Al@h@dAbARRh@d@DBpDfDb@`@xCnCPNhBfBvAzAx@|@x@t@zAvATRlBfBpA`AFOJOh@aABGd@}@z@eBHQHOf@_Az@gBx@gBp@wA\\u@`@y@RRbA~@',
  totalTimeSeconds: 1500,
  totalDistanceMeters: 2095,
  signalCheckpoints: [
    { nodeId: 2001, lat: 37.535579, lng: 126.973454, etaFromStartSeconds: 15, signalState: 'GREEN', recommendedPace: 'NORMAL'    },
    { nodeId: 2002, lat: 37.531389, lng: 126.969849, etaFromStartSeconds: 30, signalState: 'RED',   recommendedPace: 'SPEED_UP'  },
    { nodeId: 2003, lat: 37.526283, lng: 126.965254, etaFromStartSeconds: 45, signalState: 'GREEN', recommendedPace: 'SLOW_DOWN' },
  ],
};

export interface DemoRouteData {
  route: RouteResponse;
  firstSignalDistanceMeters: number;
}

export const DEMO_ROUTES: {
  originKeywords: string[];
  destKeywords: string[];
  data: DemoRouteData;
}[] = [
  {
    originKeywords: ['여의도중학교'],
    destKeywords: ['더현대'],
    data: { route: ROUTE_YEOUIDO, firstSignalDistanceMeters: 280 },
  },
  {
    originKeywords: ['용산파크자이'],
    destKeywords: ['서빙고로 48', '서빙고', '철우아파트'],
    data: { route: ROUTE_YONGSAN, firstSignalDistanceMeters: 120 },
  },
];

export function findDemoRouteData(originName: string, destName: string): DemoRouteData | null {
  for (const demo of DEMO_ROUTES) {
    if (
      demo.originKeywords.some(k => originName.includes(k)) &&
      demo.destKeywords.some(k => destName.includes(k))
    ) {
      return demo.data;
    }
  }
  return null;
}

// findDemoRoute kept for backward compatibility
export function findDemoRoute(originName: string, destName: string): RouteResponse | null {
  return findDemoRouteData(originName, destName)?.route ?? null;
}
