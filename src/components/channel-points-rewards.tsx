import React, {
  FunctionComponent,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Portal } from '@material-ui/core';
import {
  getSettingsRowContainer,
  TwitchSettingsRow,
} from './twitch/settings-row';
import { ChannelPointRewardProfile } from './channel-point-reward-profile';
import { TwitchButton } from './twitch/button';
import { AppContext } from './app-context';
import {
  addChanelPointRewardsListener,
  ChannelPointReward,
  getActiveRewardIds,
  removeChanelPointRewardsListener,
  setChannelPointRewards,
} from '@src/utils/channel-point-rewards';
import { Action } from '@src/store/actions';
import {
  ChannelPointRewardProfileModal,
  Props as ModalProps,
} from './channel-point-reward-profile-modal';
import { useTranslation } from '@src/utils/i18n';
import { TwitchModalConfirmation } from './twitch/modal-confirmation';
import { TFunction } from 'i18next';

export interface Props {
  currentRewards: ChannelPointReward[];
  rewardsProfiles: ChannelPointsRewardsProfile[];
}

export interface ChannelPointsRewardsProfile {
  name: string;
  rewardIds: string[];
}

type ModalType = 'new' | 'edit' | 'delete' | undefined;
interface EditingProfile {
  index: number;
  profile: ChannelPointsRewardsProfile;
}

function isProfileActive(
  profile: ChannelPointsRewardsProfile,
  rewards: string[]
): boolean {
  return (
    profile.rewardIds.sort().join(',').toLowerCase() ===
    rewards.sort().join(',').toLowerCase()
  );
}

export const ChannelPointsRewards: FunctionComponent<Props> = (props) => {
  const { dispatch } = useContext(AppContext);

  useEffect(() => {
    addChanelPointRewardsListener((rewards) => {
      dispatch({
        rewards,
        type: 'SET_CURRENT_REWARDS',
      });
    });

    return removeChanelPointRewardsListener;
  }, []);

  return (
    <Portal container={getPortalContainer()}>{render(props, dispatch)}</Portal>
  );
};

function getPortalContainer(): HTMLDivElement | null {
  const CONTAINER_ID = `${PACKAGE_NAME}-channel-profiles`;
  let container: HTMLDivElement | null;

  container = document.getElementById(CONTAINER_ID) as HTMLDivElement;
  if (container) return container;

  const parent = document.querySelector('.settings-row')?.parentElement;
  if (!parent) return null;

  container = getSettingsRowContainer();
  container.id = CONTAINER_ID;
  parent.children[0]?.insertAdjacentElement('afterend', container);

  return container;
}

function render(
  { currentRewards, rewardsProfiles }: Props,
  dispatch: React.Dispatch<Action>
): JSX.Element {
  const [modalType, setModalOpen] = useState<ModalType>();
  const [editingProfile, setEditingProfile] = useState<
    EditingProfile | undefined
  >(); // tslint:disable-line: ter-func-call-spacing
  const { t } = useTranslation('channelPointRewards');

  const profileList = renderProfiles(
    rewardsProfiles,
    currentRewards,
    dispatch,
    setModalOpen,
    setEditingProfile
  );

  const modal = renderModal(
    modalType,
    currentRewards,
    editingProfile,
    dispatch,
    setModalOpen,
    setEditingProfile
  );

  return (
    <TwitchSettingsRow title={t('sectionTitle')} noContainer={true}>
      {renderDescription()}
      {renderNewButton(setModalOpen)}
      {profileList}
      {modal}
    </TwitchSettingsRow>
  );
}

function renderDescription(): JSX.Element {
  const { t } = useTranslation('channelPointRewards');

  return <p className="tw-mg-b-05">{t('description')}</p>;
}

function renderNewButton(setModalOpen: (type: ModalType) => void): JSX.Element {
  const { t } = useTranslation('channelPointRewards');
  const openDialog = () => {
    setModalOpen('new');
  };

  return (
    <div className="tw-pd-t-05">
      <TwitchButton type="secondary" icon="add" onClick={openDialog}>
        {t('createNew')}
      </TwitchButton>
    </div>
  );
}

function renderProfiles(
  profiles: ChannelPointsRewardsProfile[],
  currentRewards: ChannelPointReward[],
  dispatch: React.Dispatch<Action>,
  setModalOpen: (type: ModalType) => void,
  setEditingProfile: (profile: EditingProfile) => void
): JSX.Element[] {
  const activeRewardIds = getActiveRewardIds(currentRewards);

  const onDelete = (index: number) => {
    setModalOpen('delete');
    setEditingProfile({
      index,
      profile: profiles[index],
    });
  };

  const onSelect = (index: number) => {
    setChannelPointRewards(profiles[index].rewardIds);
    dispatch({
      type: 'SET_CURRENT_REWARDS',
      rewards: currentRewards,
    });
  };

  const onUpdate = (index: number) => {
    dispatch({
      index,
      type: 'SET_REWARD_PROFILE_REWARDS',
      rewardIds: activeRewardIds,
    });
  };

  const onRename = (index: number) => {
    setModalOpen('edit');
    setEditingProfile({
      index,
      profile: profiles[index],
    });
  };

  return profiles.map((profile, i) => {
    return (
      <ChannelPointRewardProfile
        key={i}
        index={i}
        name={profile.name}
        active={isProfileActive(profile, activeRewardIds)}
        onDelete={onDelete}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRename={onRename}
      />
    );
  });
}

function renderModal(
  modalType: ModalType,
  currentRewards: ChannelPointReward[],
  editingProfile: EditingProfile | undefined,
  dispatch: React.Dispatch<Action>,
  setModalOpen: (type: ModalType) => void,
  setEditingProfile: (profile: EditingProfile | undefined) => void
): JSX.Element | undefined {
  const { t } = useTranslation('channelPointRewards');
  if (!modalType) return;

  const closeModal = () => {
    setModalOpen(undefined);
    setEditingProfile(undefined);
  };

  const createNewProfile = (profileName: string) => {
    setModalOpen(undefined);
    if (!profileName) return;

    const activeRewardIds = getActiveRewardIds(currentRewards);
    dispatch({
      type: 'ADD_REWARD_PROFILE',
      name: profileName,
      rewardIds: activeRewardIds,
    });
  };

  if (modalType === 'new') {
    return renderNewModal(createNewProfile, closeModal);
  }
  if (modalType === 'edit' && editingProfile) {
    return renderEditModal(editingProfile, dispatch, closeModal);
  }
  if (modalType === 'delete' && editingProfile) {
    return renderDeleteModal(t, editingProfile, dispatch, closeModal);
  }
}

function renderNewModal(
  onSave: ModalProps['onSave'],
  onCancel: ModalProps['onCancel']
): JSX.Element {
  return <ChannelPointRewardProfileModal onSave={onSave} onCancel={onCancel} />;
}

function renderEditModal(
  editingProfile: EditingProfile,
  dispatch: React.Dispatch<Action>,
  closeModal: ModalProps['onCancel']
): JSX.Element {
  const updateProfile = (name: string) => {
    closeModal();
    if (!name) return;

    dispatch({
      name,
      index: editingProfile!.index,
      type: 'SET_REWARD_PROFILE_NAME',
    });
  };

  return (
    <ChannelPointRewardProfileModal
      name={editingProfile.profile.name}
      onSave={updateProfile}
      onCancel={closeModal}
    />
  );
}

function renderDeleteModal(
  t: TFunction,
  editingProfile: EditingProfile,
  dispatch: React.Dispatch<Action>,
  closeModal: ModalProps['onCancel']
): JSX.Element {
  const deleteProfile = () => {
    closeModal();
    dispatch({
      index: editingProfile.index,
      type: 'REMOVE_REWARD_PROFILE',
    });
  };

  const message = t('deleteConfirmationMessage', {
    profileName: editingProfile.profile.name,
  });

  return (
    <TwitchModalConfirmation
      title={t('deleteConfirmationTitle')}
      onClose={closeModal}
      onYes={deleteProfile}
    >
      {message}
    </TwitchModalConfirmation>
  );
}
