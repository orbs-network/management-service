import { isValidTimeRef, isValidEthereumAddress } from './deep-matcher';

export const expectationVcManagement = {
  CurrentRefTime: isValidTimeRef,
  PageStartRefTime: isValidTimeRef,
  PageEndRefTime: isValidTimeRef,
};

export const expectationHistoricVcManagement = {
  CurrentRefTime: isValidTimeRef,
  PageStartRefTime: 0,
  PageEndRefTime: isValidTimeRef,
};
