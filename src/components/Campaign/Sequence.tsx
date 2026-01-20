import React, { forwardRef } from 'react';
import Sequence from './Sequence/Sequence';
import { SequenceRef } from './Sequence/Sequence';

const SequenceComponent = forwardRef<SequenceRef>((props, ref) => {
    return <Sequence ref={ref} />;
});

SequenceComponent.displayName = 'SequenceComponent';

export default SequenceComponent;
