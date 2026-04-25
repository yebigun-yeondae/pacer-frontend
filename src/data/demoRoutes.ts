import type { RouteResponse } from '../api/routeApi';

const ROUTE_YEOUIDO: RouteResponse = {
  polyline: '_|_dFkeweWhAaBzB_DHIZEtBzDfCxENNTRFJh@fAnAdCpBvDLV?b@CZG\\}CxCMLy@x@eBbBo@n@a@`@wDnDIH_D|CgAdAoA}BEKcAkB[k@]o@aE`E',
  totalTimeSeconds: 1200,
  totalDistanceMeters: 1633,
  signalCheckpoints: [
    { nodeId: 1001, lat: 37.521358, lng: 126.935220, etaFromStartSeconds: 10, signalState: 'RED',   recommendedPace: 'SLOW_DOWN' },
    { nodeId: 1002, lat: 37.520133, lng: 126.932622, etaFromStartSeconds: 25, signalState: 'GREEN', recommendedPace: 'SPEED_UP'  },
    { nodeId: 1003, lat: 37.523168, lng: 126.929653, etaFromStartSeconds: 40, signalState: 'RED',   recommendedPace: 'NORMAL'    },
  ],
};

const ROUTE_YONGSAN: RouteResponse = {
  polyline: 'khbdFqi~eW_@nB[~AAVPHLS@IbAkEH]JaBDKDOVKNMLAPCZ?\\BPNl@h@hDvClDjDh@d@~@|@~@`Al@h@dAbARRh@d@DBpDfDb@`@xCnCPNhBfBvAzAx@|@x@t@zAvATRlBfBpA`AFOJOh@aABGd@}@z@eBHQHOf@_Az@gBx@gBp@wA\\u@`@y@RRbA~@',
  totalTimeSeconds: 1500,
  totalDistanceMeters: 2095,
  signalCheckpoints: [
    { nodeId: 2001, lat: 37.535579, lng: 126.973454, etaFromStartSeconds: 10, signalState: 'GREEN', recommendedPace: 'SPEED_UP'  },
    { nodeId: 2002, lat: 37.531389, lng: 126.969849, etaFromStartSeconds: 25, signalState: 'RED',   recommendedPace: 'SLOW_DOWN' },
    { nodeId: 2003, lat: 37.526283, lng: 126.965254, etaFromStartSeconds: 40, signalState: 'GREEN', recommendedPace: 'NORMAL'    },
  ],
};

export const DEMO_ROUTES: {
  originKeywords: string[];
  destKeywords: string[];
  route: RouteResponse;
}[] = [
  { originKeywords: ['여의도중학교'], destKeywords: ['더현대'],            route: ROUTE_YEOUIDO },
  { originKeywords: ['용산파크자이'], destKeywords: ['서빙고로 48', '서빙고'], route: ROUTE_YONGSAN  },
];

export function findDemoRoute(originName: string, destName: string): RouteResponse | null {
  for (const demo of DEMO_ROUTES) {
    const originMatch = demo.originKeywords.some(k => originName.includes(k));
    const destMatch   = demo.destKeywords.some(k => destName.includes(k));
    if (originMatch && destMatch) return demo.route;
  }
  return null;
}
