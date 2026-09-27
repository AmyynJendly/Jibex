import { useQuery } from '@tanstack/react-query';

import { DISPATCH_PHONE, SUPPORT_EMAIL } from '../constants/contact';
import { getDispatchContact } from '../services/api';

/**
 * The phone and email a driver reaches their agency on: the agency's own,
 * from the data the app already loads, or the placeholders in
 * constants/contact when the agency has none on file.
 */
export function useDispatchContact() {
  const { data } = useQuery({
    queryKey: ['dispatchContact'],
    queryFn: getDispatchContact,
    // Cheap (it reads data already loaded), and the signed-in driver may
    // have changed since the login screen last asked.
    staleTime: 0,
  });
  return {
    phone: data?.phone || DISPATCH_PHONE,
    email: data?.email || SUPPORT_EMAIL,
    agencyName: data?.agencyName,
  };
}
